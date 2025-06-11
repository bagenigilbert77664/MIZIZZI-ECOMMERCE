#!/bin/bash

echo "🔧 Starting Database Services"
echo "=============================="

# Check if PostgreSQL is installed
if command -v psql &> /dev/null; then
    echo "✅ PostgreSQL found"

    # Start PostgreSQL service
    echo "Starting PostgreSQL service..."

    # Try different methods to start PostgreSQL
    if command -v systemctl &> /dev/null; then
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
        echo "✅ PostgreSQL started via systemctl"
    elif command -v brew &> /dev/null; then
        brew services start postgresql
        echo "✅ PostgreSQL started via brew"
    elif command -v pg_ctl &> /dev/null; then
        pg_ctl -D /usr/local/var/postgres start
        echo "✅ PostgreSQL started via pg_ctl"
    else
        echo "❌ Could not start PostgreSQL automatically"
        echo "Please start PostgreSQL manually"
    fi

    # Wait a moment for service to start
    sleep 2

    # Check if PostgreSQL is running
    if pg_isready &> /dev/null; then
        echo "✅ PostgreSQL is running"

        # Create database and user if they don't exist
        echo "Setting up database..."

        # Create database
        sudo -u postgres createdb mizizzi 2>/dev/null || echo "Database 'mizizzi' already exists"

        # Create user
        sudo -u postgres psql -c "CREATE USER mizizzi WITH PASSWORD 'junior2020';" 2>/dev/null || echo "User 'mizizzi' already exists"

        # Grant privileges
        sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE mizizzi TO mizizzi;" 2>/dev/null

        echo "✅ Database setup complete"
        echo "Connection string: postgresql://mizizzi:junior2020@localhost:5432/mizizzi"

    else
        echo "❌ PostgreSQL failed to start"
    fi

else
    echo "❌ PostgreSQL not found"
    echo "Install PostgreSQL first:"
    echo "  Ubuntu/Debian: sudo apt install postgresql postgresql-contrib"
    echo "  macOS: brew install postgresql"
    echo "  CentOS/RHEL: sudo yum install postgresql-server postgresql-contrib"
fi

echo ""
echo "🚀 You can now start your Flask app!"
