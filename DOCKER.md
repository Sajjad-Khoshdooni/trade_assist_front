# Docker Setup Guide

This guide explains how to run the Trader Frontend application using Docker.

## Prerequisites

- Docker (version 20.10 or higher)
- Docker Compose (version 2.0 or higher)

## Quick Start

### Using the Run Script (Recommended)

The easiest way to run the project is using the provided bash script:

```bash
# Make the script executable (already done)
chmod +x run.sh

# Run in development mode (with hot reload)
./run.sh dev

# Run in production mode
./run.sh prod
```

### Available Commands

The `run.sh` script supports the following commands:

| Command | Description |
|---------|-------------|
| `./run.sh dev` | Start development server with hot reload |
| `./run.sh prod` | Build and start production server |
| `./run.sh build` | Build production Docker image |
| `./run.sh up` | Start containers |
| `./run.sh down` | Stop containers |
| `./run.sh restart` | Restart containers |
| `./run.sh logs` | Show container logs (follow mode) |
| `./run.sh clean` | Remove all containers, images, and volumes |
| `./run.sh help` | Show help message |

## Manual Docker Commands

If you prefer to use Docker commands directly:

### Development Mode

```bash
# Using Docker Compose with dev profile
docker compose --profile dev up trader-frontend-dev

# Or using docker-compose (older versions)
docker-compose --profile dev up trader-frontend-dev
```

This will:
- Mount your local code into the container
- Enable hot reload
- Install dependencies automatically
- Run on port 3000

### Production Mode

```bash
# Build and start
docker compose up --build -d trader-frontend

# View logs
docker compose logs -f trader-frontend

# Stop
docker compose down
```

## Docker Configuration

### Dockerfile

The Dockerfile uses multi-stage builds for optimization:

1. **Base Stage**: Sets up Node.js and pnpm
2. **Dependencies Stage**: Installs npm packages
3. **Builder Stage**: Builds the Next.js application
4. **Runner Stage**: Creates a minimal production image

### docker-compose.yml

Two services are defined:

1. **trader-frontend**: Production service
   - Builds from Dockerfile
   - Exposes port 3000
   - Includes health checks
   - Auto-restarts on failure

2. **trader-frontend-dev**: Development service
   - Uses volume mounts for hot reload
   - Runs with `pnpm dev`
   - Only starts with `--profile dev` flag

## Environment Variables

You can add environment variables by creating a `.env` file in the root directory:

```env
# Example .env file
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.example.com
```

Then update `docker-compose.yml` to include:

```yaml
services:
  trader-frontend:
    env_file:
      - .env
```

## Port Configuration

By default, the application runs on port 3000. To change this:

1. Update the port mapping in `docker-compose.yml`:
```yaml
ports:
  - "8080:3000"  # Host:Container
```

2. Access the app at `http://localhost:8080`

## Troubleshooting

### Port Already in Use

If port 3000 is already in use:

```bash
# Find the process using port 3000
lsof -i :3000

# Kill the process or change the port in docker-compose.yml
```

### Build Fails

```bash
# Clean everything and rebuild
./run.sh clean
./run.sh prod
```

### Permission Issues

If you encounter permission issues:

```bash
# Reset ownership
sudo chown -R $USER:$USER .

# Make sure run.sh is executable
chmod +x run.sh
```

### View Container Logs

```bash
# Follow logs
./run.sh logs

# Or view specific container
docker logs -f trader-frontend
```

## Performance Tips

1. **Use .dockerignore**: Already configured to exclude unnecessary files
2. **Multi-stage builds**: Reduces final image size
3. **Layer caching**: Docker caches layers for faster rebuilds
4. **Volume mounts**: Development mode uses volumes for instant updates

## Production Deployment

For production deployment:

1. Set environment variables properly
2. Use a reverse proxy (nginx/Traefik)
3. Enable HTTPS
4. Set up container orchestration (Kubernetes/Docker Swarm)
5. Implement proper logging and monitoring

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Next.js Docker Documentation](https://nextjs.org/docs/deployment#docker-image)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

## Support

For issues or questions, please refer to the main README.md or open an issue in the repository.

