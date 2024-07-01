package database

import (
	"context"
	"errors"
	"fmt"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"log"
	"os"
	"sync"
)

var clientInstance *mongo.Client

var clientInstanceError error

var mongoOnce sync.Once

func DBInit() {

	uri := os.Getenv("DB_URL")

	mongoOnce.Do(func() {
		serverAPI := options.ServerAPI(options.ServerAPIVersion1)
		opts := options.Client().ApplyURI(uri).SetServerAPIOptions(serverAPI)

		client, err := mongo.Connect(context.TODO(), opts)
		if err != nil {
			clientInstanceError = err
			log.Println("Connection error:", err)
			return
		}

		// Send a ping to confirm a successful connection
		if err = client.Database("admin").RunCommand(context.TODO(), bson.D{{"ping", 1}}).Err(); err != nil {
			clientInstanceError = err
			panic(err)
		}

		fmt.Println("Successfully connected to MongoDB!")
		clientInstance = client
	})
}

func GetDB() (*mongo.Client, error) {
	if clientInstance == nil {
		return nil, errors.New("mongoDB client is not initialized")
	}
	if clientInstanceError != nil {
		return nil, clientInstanceError
	}
	return clientInstance, nil
}
