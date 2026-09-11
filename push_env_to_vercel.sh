#!/bin/bash

# Ensure Vercel CLI is installed and linked before running this script
# vercel login
# vercel link

ENV_FILE=".env"
ENVIRONMENTS="production preview development"

if [ ! -f "$ENV_FILE" ]; then
    echo "Error: $ENV_FILE not found!"
    exit 1
fi

echo "Reading environment variables from $ENV_FILE..."

while IFS= read -r line || [[ -n "$line" ]]; do
    # Skip empty lines and comments
    if [[ ! "$line" =~ ^# && -n "$line" ]]; then
        # Extract key and value
        key=$(echo "$line" | cut -d '=' -f 1)
        value=$(echo "$line" | cut -d '=' -f 2-)
        
        echo "----------------------------------------"
        echo "Adding $key to Vercel ($ENVIRONMENTS)..."
        
        # Note: vercel env add takes <environment> space separated, e.g. "production preview development"
        echo -n "$value" | vercel env add "$key" $ENVIRONMENTS
        
    fi
done < "$ENV_FILE"

echo "----------------------------------------"
echo "All environment variables pushed successfully!"
echo "Run 'vercel env ls' to verify."
