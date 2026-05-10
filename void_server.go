```go
package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gofrs/uuid"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// Global variable for JWT secret key. In a real app, use environment variables.
var jwtSecretKey = []byte(os.Getenv("JWT_SECRET"))

func init() {
	if len(jwtSecretKey) == 0 {
		log.Println("JWT_SECRET environment variable not set. Using a default insecure key. DO NOT USE IN PRODUCTION.")
		jwtSecretKey = []byte("supersecretjwtkey") // Insecure default
	}
}

// GORM Models

// User represents a user in the system.
type User struct {
	ID                  uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	Username            string    `gorm:"uniqueIndex;not null" json:"username"`
	PasswordHash        string    `gorm:"not null" json:"-"` // - hides it from JSON output
	SolanaWalletAddress string    `json:"solana_wallet_address"`
	Posts               []Post    `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE;" json:"posts,omitempty"`
	gorm.Model                    // Adds CreatedAt, UpdatedAt, DeletedAt
}

// BeforeCreate hook to generate a UUID for the User ID.
func (u *User) BeforeCreate(tx *gorm.DB) (err error) {
	u.ID, err = uuid.NewV4()
	return err
}

// Post represents a user's post.
type Post struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	User      User      `gorm:"foreignKey:UserID;references:ID" json:"user"` // Belongs To relationship
	Content   string    `gorm:"type:text;not null" json:"content"`
	gorm.Model          // Adds CreatedAt, UpdatedAt, DeletedAt
}

// BeforeCreate hook to generate a UUID for the Post ID.
func (p *Post) BeforeCreate(tx *gorm.DB) (err error) {
	p.ID, err = uuid.NewV4()
	return err
}

// Request/Response DTOs

// RegisterRequest struct for user registration
type RegisterRequest struct {
	Username            string `json:"username" binding:"required"`
	Password            string `json:"password" binding:"required"`
	SolanaWalletAddress string `json:"solana_wallet_address" binding:"required"`
}

// LoginRequest struct for user login
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// CreatePostRequest struct for creating a post
type CreatePostRequest struct {
	Content string `json:"content" binding:"required"`
}

// TipRequest struct for tipping (stub)
type TipRequest struct {
	PostID uuid.UUID `json:"post_id" binding:"required"` // Or UserID
	Amount float64   `json:"amount" binding:"required"`
}

// Claims defines the JWT token claims
type Claims struct {
	UserID uuid.UUID `json:"user_id"`
	jwt.RegisteredClaims
}

// Database Connection and Migration
func initDB() *gorm.DB {
	// DATABASE_URL example: "host=localhost user=gorm password=gorm dbname=gorm port=5432 sslmode=disable TimeZone=Asia/Shanghai"
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Println("DATABASE_URL environment variable not set. Using default PostgreSQL DSN.")
		// Default DSN for local development. Make sure your postgres user/db/password match or change.
		dsn = "host=localhost user=gorm password=gorm dbname=gorm port=5432 sslmode=disable TimeZone=UTC"
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	// AutoMigrate will create/update tables
	err = db.AutoMigrate(&User{}, &Post{})
	if err != nil {
		log.Fatalf("failed to auto migrate database: %v", err)
	}

	log.Println("Database connection and migration successful.")
	return db
}

// JWT Helper Functions

// generateJWT creates a new JWT token for the given user ID.
func generateJWT(userID uuid.UUID) (string, error) {
	expirationTime := time.Now().Add(24 * time.Hour) // Token valid for 24 hours
	claims := &Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtSecretKey)
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %w", err)
	}
	return tokenString, nil
}

// authMiddleware is a Gin middleware to validate JWT tokens.
func authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString := c.GetHeader("Authorization")
		if tokenString == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		// Expecting "Bearer <token>"
		if len(tokenString) < 7 || tokenString[:7] != "Bearer " {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token format"})
			c.Abort()
			return
		}
		tokenString = tokenString[7:]

		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return jwtSecretKey, nil
		})

		if err != nil {
			if err == jwt.ErrSignatureInvalid {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token signature"})
				c.Abort()
				return
			}
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: " + err.Error()})
			c.Abort()
			return
		}

		if !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		c.Set("userID", claims.UserID) // Set userID in context for subsequent handlers
		c.Next()
	}
}

// Handlers

// register handles user registration.
func register(c *gin.Context, db *gorm.DB) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if username already exists
	var existingUser User
	if db.Where("username = ?", req.Username).First(&existingUser).Error == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Username already taken"})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	user := User{
		Username:            req.Username,
		PasswordHash:        string(hashedPassword),
		SolanaWalletAddress: req.SolanaWalletAddress,
	}

	if err := db.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "User registered successfully", "id": user.ID, "username": user.Username})
}

// login handles user login and JWT token generation.
func login(c *gin.Context, db *gorm.DB) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user User
	if err := db.Where("username = ?", req.Username).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	tokenString, err := generateJWT(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Login successful", "token": tokenString})
}

// createPost handles creating a new post. Requires authentication.
func createPost(c *gin.Context, db *gorm.DB) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in context"})
		return
	}

	var req CreatePostRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	post := Post{
		UserID:  userID.(uuid.UUID),
		Content: req.Content,
	}

	if err := db.Create(&post).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create post"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Post created successfully", "post_id": post.ID, "user_id": post.UserID})
}

// getFeed returns a list of all posts.
func getFeed(c *gin.Context, db *gorm.DB) {
	var posts []Post
	// Preload User information for each post
	if err := db.Preload("User").Order("created_at desc").Find(&posts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve posts"})
		return
	}

	// Sanitize user data for feed (e.g., remove password hash)
	for i := range posts {
		posts[i].User.PasswordHash = "" // Clear password hash
		posts[i].User.Posts = nil       // Prevent recursive JSON output
	}

	c.JSON(http.StatusOK, gin.H{"posts": posts})
}

// tipUser is a stub handler for tipping functionality.
func tipUser(c *gin.Context, db *gorm.DB) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in context"})
		return
	}

	var req TipRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// In a real application, you would:
	// 1. Validate PostID exists.
	// 2. Fetch the post and target user's Solana wallet address.
	// 3. Initiate a Solana transaction (e.g., using a Solana SDK).
	// 4. Handle transaction confirmation and potential errors.
	// 5. Record the tip in your database.

	log.Printf("User %s wants to tip %f to post %s", userID, req.Amount, req.PostID)

	c.JSON(http.StatusOK, gin.H{"message": "Tip functionality is a stub. Transaction not executed.", "status": "simulated_success", "amount": req.Amount})
}

func main() {
	db := initDB()
	r := gin.Default()

	// Public routes
	r.POST("/register", func(c *gin.Context) { register(c, db) })
	r.POST("/login", func(c *gin.Context) { login(c, db) })
	r.GET("/feed", func(c *gin.Context) { getFeed(c, db) })

	// Authenticated routes
	authRequired := r.Group("/")
	authRequired.Use(authMiddleware())
	{
		authRequired.POST("/posts", func(c *gin.Context) { createPost(c, db) })
		authRequired.POST("/tips", func(c *gin.Context) { tipUser(c, db) }) // Stub
	}

	log.Println("Server running on port 8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
```
