package handler

import (
	"JM/server/database"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func AddItem(c *gin.Context) {
	var item database.Item

	log.Println("Got into AddItem!")

	name := c.Request.FormValue("name")
	section := c.Request.FormValue("section")
	subsection := c.Request.FormValue("subsection")
	itemType := c.Request.FormValue("type")

	cPrice, _ := strconv.Atoi(c.Request.FormValue("price"))
	item.Price = cPrice

	cVolume, _ := strconv.Atoi(c.Request.FormValue("volume"))
	item.Volume = cVolume

	item.Country = c.Request.FormValue("country")

	jsonIngredients := c.Request.FormValue("ingredients")

	if err := json.Unmarshal([]byte(jsonIngredients), &item.Ingredients); err != nil {
		log.Println("Bad ingredients!", err)
		c.JSON(400, gin.H{"msg": "Invalid ingredients data!"})
		return
	}

	item.Use = c.Request.FormValue("use")
	item.Brand = c.Request.FormValue("brand")

	isDiscountStr := c.Request.FormValue("discount")

	isDiscount, err := strconv.ParseBool(isDiscountStr)
	if err != nil {
		log.Println("Can't convert isDiscount bool", err)
		c.JSON(400, gin.H{"msg": "Unable to parse bool statement"})
		return
	}

	item.Discount = isDiscount
	discountSizeStr := c.Request.FormValue("discountSize")
	if discountSizeStr == "" {
		discountSizeStr = "0"
	}
	discountSize, err := strconv.Atoi(discountSizeStr)
	if err != nil {
		log.Println("Can't convert discountSize string", err)
		c.JSON(400, gin.H{"msg": "Unable to parse string!"})
		return
	}

	item.DiscountSize = discountSize

	isNewStr := c.Request.FormValue("new")

	isNew, err := strconv.ParseBool(isNewStr)
	if err != nil {
		log.Println("Can't convert isNew bool", err)
		c.JSON(400, gin.H{"msg": "Unable to parse string!"})
	}

	item.IsNew = isNew

	isStockStr := c.Request.FormValue("stock")

	isStock, err := strconv.ParseBool(isStockStr)
	if err != nil {
		c.JSON(400, gin.H{"msg": "Unable to parse string!"})
	}

	item.IsStock = isStock

	skuStr := c.Request.FormValue("sku")

	sku, err := strconv.Atoi(skuStr)
	if err != nil {
		c.JSON(400, gin.H{"msg": "Unable to parse string!"})
	}

	item.SKU = sku

	images, err := ProcessImage(c, section)
	if err != nil {
		c.JSON(400, gin.H{"msg": err.Error()})
		return
	}

	description := c.Request.FormValue("description")
	howTo := c.Request.FormValue("howToUse")

	item.Name = name
	item.Section = section
	item.Subsection = subsection
	item.Images = images
	item.Description = description
	item.Type = itemType
	item.CreatedAt = time.Now().UTC()
	item.HowTo = howTo
	item.Id = primitive.NewObjectID()

	msg, err := PushItem(c, item)
	if err != nil {
		log.Println("Error with item object!", err)
		c.JSON(400, gin.H{"msg": err.Error()})
	}

	c.JSON(200, gin.H{"msg": msg})

}

func PushItem(c *gin.Context, item database.Item) (string, error) {
	client, err := database.GetDB()
	if err != nil {
		c.JSON(400, gin.H{"msg": err.Error()})
		return "", err
	}

	collection := client.Database("Japanomania").Collection("Products")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	_, err = collection.InsertOne(ctx, item)
	if err != nil {
		c.JSON(400, gin.H{"msg": err.Error()})
		return "", err
	}

	msg := "Inserted item: " + item.Name + ", to a database!"

	return msg, nil

}

func ProcessImage(c *gin.Context, section string) (string, error) {
	
	const MAX_FILESIZE = 10 << 20
	log.Println("Got into ProcessImage!")
	err := c.Request.ParseMultipartForm(MAX_FILESIZE)
	if err != nil {
		log.Println("Image is too big")
		c.JSON(http.StatusBadRequest, gin.H{
			"msg": err.Error(),
		})
		return "", err
	}

	file, header, err := c.Request.FormFile("image")
	if err != nil {
		log.Println("Bad file receive!", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"msg": err.Error(),
		})
		return "", err
	}
	defer file.Close()

	if header.Size > MAX_FILESIZE {
		log.Println("Header size is too big!")
		errMsg := "File is too large!"
		c.JSON(http.StatusBadRequest, gin.H{
			"msg": errMsg,
		})
		return "", errors.New(errMsg)
	}

	dirPath := filepath.Join("public", "images", section)
	if err = os.MkdirAll(dirPath, 0755); err != nil && !os.IsExist(err) {
		log.Println("Can't create a directory!", err)
		c.JSON(http.StatusBadRequest, gin.H{"msg": err.Error()})

		return "", err
	}

	newFileName := fmt.Sprintf("%s-%s", time.Now().Format("20060102150405"), header.Filename)
	filepath := filepath.Join(dirPath, newFileName)

	out, err := os.Create(filepath)
	if err != nil {
		log.Println("Can't create an image at the filepath!", err)
		c.JSON(http.StatusInternalServerError, gin.H{"msg": err.Error()})
		return "", err
	}

	defer out.Close()

	if _, err = io.Copy(out, file); err != nil {
		log.Println("Can't move the file!", err)
		c.JSON(http.StatusInternalServerError, gin.H{"msg": err.Error()})
		return "", err
	}

	return filepath, nil
}

func GetItems(c *gin.Context) {

	var items []database.Item
	const pageSize = 10
	filter := bson.M{}

	pageParam := c.DefaultQuery("page", "1")
	pageNumber, err := strconv.Atoi(pageParam)
	if err != nil || pageNumber < 1 {
		pageNumber = 1
	}

	calcSkip := (pageNumber - 1) * pageSize

	productType := c.Param("type")

	client, err := database.GetDB()
	if err != nil {
		log.Println("Database problem", err)
		c.JSON(400, gin.H{"msg": err.Error()})
		return
	}

	ctx := c.Request.Context()
	findOptions := options.Find().
		SetSort(bson.D{{Key: "createdAt", Value: -1}}). // Sort by createdAt by default
		SetLimit(pageSize).
		SetSkip(int64(calcSkip))

	collection := client.Database("Japanomania").Collection("Products")

	filter["type"] = productType

	cursor, err := collection.Find(ctx, filter, findOptions)
	if err != nil {
		log.Println("Can't find the type!", err)
		c.JSON(400, gin.H{"msg": err})
		return
	}

	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var item database.Item
		if err = cursor.Decode(&item); err != nil {
			log.Println("Can't parse the items!", err)
			c.JSON(400, gin.H{"msg": err})
			return
		}

		items = append(items, item)

	}

	log.Println("Type: ", productType)

	c.JSON(200, items)

}

func GetItem(c *gin.Context) {

	var item database.Item
	log.Println("Got into GetItem!")

	itemID := c.Param("id")
	objectID, err := primitive.ObjectIDFromHex(itemID)
	if err != nil {
		log.Println("Could not convert itemID to string!", err)
		c.JSON(400, gin.H{"msg": "Can't convert id string!"})
		return
	}

	client, err := database.GetDB()
	if err != nil {
		c.JSON(400, gin.H{"msg": err.Error()})
	}

	ctx := c.Request.Context()

	collection := client.Database("Japanomania").Collection("Products")

	filter := bson.M{"_id": objectID}

	err = collection.FindOne(ctx, filter).Decode(&item)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			log.Println("Could not find any documents with the ID!")

		} else {
			log.Println("There is an error with a query!", err)
			c.JSON(400, gin.H{})
			return
		}
	}

	c.JSON(200, item)

}
