# GoMarket

GoMarket is a simple e-commerce shop built with the Svelte framework for the frontend and Golang for the backend.

## Technologies Used

### Frontend
- **Svelte**: A framework for building fast and interactive user interfaces.
- **Vite**: A build tool that provides a faster and leaner development experience for modern web projects.
- **TailwindCSS**: A utility-first CSS framework for rapid UI development.

### Backend
- **Golang**: A statically typed, compiled programming language designed for simplicity and performance.
- **Gin**: A web framework written in Go that provides a fast and scalable API server.

## Project Structure

- `public/`: Static assets served by the web server.
- `scripts/`: Utility scripts for the project.
- `server/`: Go backend server code.
- `src/`: Svelte frontend application code.
- `styles/`: Global styles using TailwindCSS.

## Features

- **User Authentication**: Secure user login and registration system.
- **Product Management**: Admin interface for managing products.
- **Shopping Cart**: Add products to the cart and manage quantities.
- **Order Processing**: Place orders and track their status.

## Installation

### Prerequisites
- Node.js and npm
- Golang

### Steps
1. Clone the repository:
    ```sh
    git clone https://github.com/RisenSamurai/GoMarket.git
    cd GoMarket
    ```

2. Install frontend dependencies:
    ```sh
    cd src
    npm install
    cd ..
    ```

3. Install backend dependencies:
    ```sh
    go mod tidy
    ```

4. Run the backend server:
    ```sh
    go run main.go
    ```

5. Run the frontend application:
    ```sh
    cd src
    npm run dev
    ```

## Usage

- Access the application at `http://localhost:3000`.
- Admin interface for product management at `http://localhost:3000/admin`.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
