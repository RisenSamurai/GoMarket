package handler

import (
	"JM/server/database"
	"go.mongodb.org/mongo-driver/mongo"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func GetBrandName(c *gin.Context) {
	client, err := database.GetDB()
	var brands []interface{}
	if err != nil {
		log.Println("No DataBase connection!")
		c.JSON(http.StatusBadRequest, gin.H{"error": "no database connection"})
		return
	}

	log.Println("Got into GetBrands!!")

	collection := client.Database("Japanomania").Collection("Products")

	ctx := c.Request.Context()

	brands, err = collection.Distinct(ctx, "brand", bson.D{}) // Fetch distinct values
	if err != nil {
		log.Println("Error fetching distinct brands:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error fetching distinct brands"})
		return
	}

	log.Println("Brands array: ", brands)

	// Return the distinct brand names as JSON response
	c.JSON(http.StatusOK, brands)

}

func GetProductForms(c *gin.Context) {
	client, err := database.GetDB()
	var forms []interface{}
	if err != nil {
		log.Println("No DataBase connection!")
		c.JSON(http.StatusBadRequest, gin.H{"error": "no database connection"})
		return
	}

	collection := client.Database("Japanomania").Collection("Products")

	ctx := c.Request.Context()

	forms, err = collection.Distinct(ctx, "subsection", bson.D{})
	if err != nil {
		log.Println("Error fetching distinct forms:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error fetching distinct forms"})
		return
	}

	c.JSON(http.StatusOK, forms)

}

func GetCatalogItems(c *gin.Context) {
	log.Println("Got into GetCatalogItems!")

	client, err := database.GetDB()
	if err != nil {
		log.Println("No DataBase connection!")
		c.JSON(http.StatusBadRequest, gin.H{"error": "no database connection"})
		return
	}

	collection := client.Database("Japanomania").Collection("Products")

	var items []database.Item
	filter := bson.M{}

	// Query parameters
	pageSize := 2

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1 // default to first page
	}

	calcSkip := (page - 1) * pageSize

	category := c.Query("category")
	if category != "" {
		filter["section"] = category
		log.Println("Got Category:", category)
	}

	log.Println("PageNum:", page, "PageSize:", pageSize, "calcSkip:", calcSkip)

	findOptions := options.Find().
		SetSkip(int64(calcSkip)).
		SetLimit(int64(pageSize)).
		SetSort(bson.D{{Key: "createdAt", Value: -1}})

	ctx := c.Request.Context()

	cursor, err := collection.Find(ctx, filter, findOptions)
	if err != nil {
		log.Println("Error executing query:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error fetching items"})
		return
	}

	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var item database.Item
		if err = cursor.Decode(&item); err != nil {
			log.Println("Error decoding item:", err)
			continue
		}
		items = append(items, item)
	}

	log.Printf("Page: %d, PageSize: %d, Category: %s", page, pageSize, category)
	log.Printf("Items: %+v", items)

	c.JSON(http.StatusOK, items)
}

func GetMinMax(c *gin.Context) {
	log.Println("Got into GetMinMax!")
	client, err := database.GetDB()
	if err != nil {
		log.Println("No DataBase connection!")
	}

	collection := client.Database("Japanomania").Collection("Products")

	combinedPipeline := mongo.Pipeline{
		{{"$group", bson.D{{Key: "_id", Value: nil},
			{Key: "minPrice", Value: bson.D{{Key: "$min", Value: "$price"}}},
			{Key: "maxPrice", Value: bson.D{{Key: "$max", Value: "$price"}}}}}},
	}

	ctx := c.Request.Context()

	combinedCursor, err := collection.Aggregate(ctx, combinedPipeline)
	if err != nil {
		log.Println("Error aggregating pipeline:", err)
	}

	var combinedResult []bson.M
	if err = combinedCursor.All(ctx, &combinedResult); err != nil {
		log.Println("Error aggregating result:", err)
	}

	response := gin.H{
		"minPrice": nil,
		"maxPrice": nil,
	}

	if len(combinedResult) > 0 {
		response["minPrice"] = combinedResult[0]["minPrice"]
		response["maxPrice"] = combinedResult[0]["maxPrice"]
	}

	c.JSON(http.StatusOK, response)
	
}
