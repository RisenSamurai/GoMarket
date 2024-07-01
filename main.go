package main

import (
	"JM/server/database"
	"JM/server/handler"
	"log"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {

	err := godotenv.Load(".env")

	serverAddress := os.Getenv("SERVER_ADDRESS")

	if err != nil {
		log.Println("Could not load .env file!", err)
	}
	database.DBInit()

	r := gin.Default()
	r.LoadHTMLGlob("public/templates/*")
	r.Use(cors.Default())

	r.GET("/get-min-max", handler.GetMinMax)

	r.GET("/get-category-list", handler.GetCategoryList)
	r.GET("/get-brand-list", handler.GetBrandName)
	r.GET("/subcategory", handler.GetSubCategory)
	r.GET("/get-subsection-list", handler.GetProductForms)
	r.POST("/item/add", handler.AddItem)

	r.GET("/items-by-type/:type", handler.GetItems)
	r.GET("/items-by-category", handler.GetCatalogItems)
	r.GET("/item/:id", handler.GetItem)

	r.Static("static/public/", "./public/")
	r.NoRoute(func(context *gin.Context) {
		context.File("./public/index.html")
	})

	r.Run(serverAddress)

}
