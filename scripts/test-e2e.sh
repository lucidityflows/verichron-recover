#!/bin/bash
# E2E Test Script - Manages test infrastructure and runs E2E tests
# Usage: ./scripts/test-e2e.sh [service-name]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="./docker-compose.test.yml"

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  E2E Test Infrastructure Manager${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Function to check if test services are running
check_services() {
    local all_running=true

    if ! docker ps | grep -q "verichron-postgres-test"; then
        echo -e "${YELLOW}⚠ PostgreSQL test container not running${NC}"
        all_running=false
    fi

    if ! docker ps | grep -q "verichron-redis-test"; then
        echo -e "${YELLOW}⚠ Redis test container not running${NC}"
        all_running=false
    fi

    if [ "$all_running" = true ]; then
        echo -e "${GREEN}✓ All test services are running${NC}"
        return 0
    else
        return 1
    fi
}

# Function to start test services
start_services() {
  echo "Starting Docker Compose services for E2E testing..."
  docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" down --remove-orphans # Ensure clean slate
  docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" up -d --build
  echo "Waiting for services to be healthy..."
  docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" wait --timeout 120
}

# Function to stop test services
stop_services() {
    echo -e "${YELLOW}→ Stopping test infrastructure...${NC}"
    cd "$ROOT_DIR"
    docker compose -f docker-compose.test.yml down
    echo -e "${GREEN}✓ Test infrastructure stopped${NC}"
}

# Function to run tests
run_tests() {
    local service=$1

    echo -e "${YELLOW}→ Running E2E tests for ${service}...${NC}"

    cd "$ROOT_DIR"

    if [ -z "$service" ]; then
        # Run all E2E tests
        pnpm --filter @verichron/api-users test:e2e
    else
        # Run specific service tests
        pnpm --filter "@verichron/${service}" test:e2e
    fi
}

# Main script logic
main() {
    local service=${1:-}
    local command=${2:-}

    # Handle commands
    case "$service" in
        start)
            start_services
            exit 0
            ;;
        stop)
            stop_services
            exit 0
            ;;
        restart)
            stop_services
            start_services
            exit 0
            ;;
        status)
            if check_services; then
                exit 0
            else
                exit 1
            fi
            ;;
        --help|-h)
            echo "Usage: ./scripts/test-e2e.sh [service-name|command]"
            echo ""
            echo "Commands:"
            echo "  start          - Start test infrastructure"
            echo "  stop           - Stop test infrastructure"
            echo "  restart        - Restart test infrastructure"
            echo "  status         - Check if test infrastructure is running"
            echo "  --help, -h     - Show this help message"
            echo ""
            echo "Examples:"
            echo "  ./scripts/test-e2e.sh              # Run all E2E tests (auto-start services)"
            echo "  ./scripts/test-e2e.sh api-users    # Run api-users E2E tests"
            echo "  ./scripts/test-e2e.sh start        # Just start test infrastructure"
            echo "  ./scripts/test-e2e.sh stop         # Stop test infrastructure"
            exit 0
            ;;
    esac

    # Check if services are running, start if not
    if ! check_services; then
        start_services
    fi

    # Run tests
    run_tests "$service"

    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✓ E2E tests completed${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}Tip: Run './scripts/test-e2e.sh stop' to stop test infrastructure${NC}"
}

main "$@"
