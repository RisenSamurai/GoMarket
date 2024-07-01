package handler

import (
	"JM/server/database"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
)

func GetCategoryList(c *gin.Context) {

	var categories []database.Category

	log.Println("Got into method!")

	client, err := database.GetDB()
	if err != nil {
		log.Println("Database instance error!", err)
		return
	}

	collection := client.Database("Japanomania").Collection("Categories")
	ctx := c.Request.Context()

	cursor, err := collection.Find(ctx, bson.D{})
	if err != nil {
		log.Println("Bad query!", err)
		return
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var category database.Category

		err = cursor.Decode(&category)
		if err != nil {
			log.Println("Can't decode instance!", err)
			return
		}

		categories = append(categories, category)
	}

	c.JSON(200, categories)

}

func GetSubCategory(c *gin.Context) {
	var subcategories []database.SubCategory

	client, err := database.GetDB()
	if err != nil {
		log.Println("Couldn't establish connection!")

		c.JSON(http.StatusBadRequest, gin.H{
			"msg": err,
		})
		return
	}

	collection := client.Database("Japanomania").Collection("Subcategories")

	ctx := c.Request.Context()

	cursor, err := collection.Find(ctx, bson.D{})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"msg": err,
		})
		return
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var subcategory database.SubCategory

		err = cursor.Decode(&subcategory)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"msg": err,
			})
			return
		}

		subcategories = append(subcategories, subcategory)

	}

	c.JSON(200, subcategories)
}
