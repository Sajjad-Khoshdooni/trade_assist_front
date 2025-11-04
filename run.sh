#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_message() {
    echo -e "${2}${1}${NC}"
}

# Function to show usage
show_usage() {
    print_message "Usage: ./run.sh [COMMAND]" "$BLUE"
    echo ""
    echo "Commands:"
    echo "  dev         - Run development mode with hot reload"
    echo "  prod        - Build and run production mode"
    echo "  build       - Build production Docker image"
    echo "  up          - Start containers"
    echo "  down        - Stop containers"
    echo "  restart     - Restart containers"
    echo "  logs        - Show container logs"
    echo "  clean       - Remove containers, images, and volumes"
    echo "  help        - Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./run.sh dev        # Start development server"
    echo "  ./run.sh prod       # Start production server"
    echo "  ./run.sh logs       # View logs"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_message "Error: Docker is not installed!" "$RED"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_message "Error: Docker Compose is not installed!" "$RED"
        exit 1
    fi
}

# Get docker-compose command
get_compose_cmd() {
    if docker compose version &> /dev/null 2>&1; then
        echo "docker compose"
    else
        echo "docker-compose"
    fi
}

# Main script
main() {
    check_docker
    COMPOSE_CMD=$(get_compose_cmd)

    case "${1:-help}" in
        dev)
            print_message "Starting development server..." "$GREEN"
            print_message "The app will be available at http://localhost:3000" "$BLUE"
            $COMPOSE_CMD --profile dev up trader-frontend-dev
            ;;
        
        prod)
            print_message "Building and starting production server..." "$GREEN"
            $COMPOSE_CMD up --build -d trader-frontend
            print_message "Production server started!" "$GREEN"
            print_message "The app is available at http://localhost:3000" "$BLUE"
            print_message "View logs with: ./run.sh logs" "$YELLOW"
            ;;
        
        build)
            print_message "Building production Docker image..." "$GREEN"
            $COMPOSE_CMD build trader-frontend
            print_message "Build completed!" "$GREEN"
            ;;
        
        up)
            print_message "Starting containers..." "$GREEN"
            $COMPOSE_CMD up -d trader-frontend
            print_message "Containers started!" "$GREEN"
            ;;
        
        down)
            print_message "Stopping containers..." "$YELLOW"
            $COMPOSE_CMD down
            print_message "Containers stopped!" "$GREEN"
            ;;
        
        restart)
            print_message "Restarting containers..." "$YELLOW"
            $COMPOSE_CMD restart
            print_message "Containers restarted!" "$GREEN"
            ;;
        
        logs)
            print_message "Showing logs (Ctrl+C to exit)..." "$BLUE"
            $COMPOSE_CMD logs -f
            ;;
        
        clean)
            print_message "This will remove all containers, images, and volumes. Are you sure? (y/N)" "$YELLOW"
            read -r response
            if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
                print_message "Cleaning up..." "$YELLOW"
                $COMPOSE_CMD down -v --rmi all
                print_message "Cleanup completed!" "$GREEN"
            else
                print_message "Cleanup cancelled." "$BLUE"
            fi
            ;;
        
        help|--help|-h)
            show_usage
            ;;
        
        *)
            print_message "Error: Unknown command '${1}'" "$RED"
            echo ""
            show_usage
            exit 1
            ;;
    esac
}

main "$@"

