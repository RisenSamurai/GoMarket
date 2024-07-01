package database

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Category struct {
	Name  string `bson:"name"`
	Image string `bson:"image"`
}

type SubCategory struct {
	Name string `bson:"name"`
}

type Ingredients struct {
	Name []string `bson:"name"`
}

type Item struct {
	Id           primitive.ObjectID `bson:"_id, omitempty"`
	Name         string             `bson:"name"`
	Section      string             `bson:"section"`
	Subsection   string             `bson:"subsection"`
	Type         string             `bson:"type"`
	Price        int                `bson:"price"`
	Volume       int                `bson:"volume"`
	Country      string             `bson:"country"`
	Ingredients  []string           `bson:"ingredients"`
	Use          string             `bson:"use"`
	Brand        string             `bson:"brand"`
	Discount     bool               `bson:"discount"`
	DiscountSize int                `bson:"discountSize"`
	IsNew        bool               `bson:"isNew"`
	IsStock      bool               `bson:"isStock"`
	SKU          int                `bson:"sku"`
	Images       string             `bson:"images"`
	Description  string             `bson:"description"`
	HowTo        string             `bson:"howTo"`
	CreatedAt    time.Time          `bson:"createdAt"`
}

type Order struct {
	Id         primitive.ObjectID `bson:"_id, omitempty"`
	Name       string             `bson:"name"`
	MiddleName string             `bson:"middleName"`
	Surname    string             `bson:"surname"`
	Phone      string             `bson:"phone"`
	Email      string             `bson:"email"`
	Country    string             `bson:"country"`
	State      string             `bson:"state"`
	City       string             `bson:"city"`
	Post       string             `bson:"post"`
	Pay        string             `bson:"pay"`
	Total      string             `bson:"total"`
	Products   []Item             `bson:"product"`
	ItemsCount int8               `bson:"itemsCount"`
	CreatedAt  time.Time          `bson:"createdAt"`
}
