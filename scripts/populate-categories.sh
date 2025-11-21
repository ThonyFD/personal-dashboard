#!/bin/bash
# Script to populate categories using Firebase Data Connect REST API

PROJECT_ID="mail-reader-433802"
LOCATION="us-central1"
SERVICE_ID="personal-dashboard"
CONNECTOR_ID="default"

BASE_URL="https://firebasedataconnect.googleapis.com/v1beta/projects/${PROJECT_ID}/locations/${LOCATION}/services/${SERVICE_ID}/connectors/${CONNECTOR_ID}:executeMutation"

# Get access token
echo "🔑 Getting access token..."
TOKEN=$(~/google-cloud-sdk/bin/gcloud auth print-access-token)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get access token. Make sure you're logged in with: gcloud auth login"
  exit 1
fi

echo "✅ Access token obtained"
echo ""
echo "📝 Creating categories..."
echo ""

# Category data
declare -a CATEGORIES=(
  "1|Food & Dining|🍽️|#FF6B6B|Restaurants, Coffee shops, Fast food, Bars"
  "2|Groceries|🛒|#4ECB71|Supermarkets, Grocery stores"
  "3|Transportation|🚗|#4ECDC4|Uber, Gas stations, Parking, Tolls"
  "4|Entertainment|🎮|#9B59B6|Netflix, Gaming, Movies, Streaming services"
  "5|Shopping|🛍️|#F39C12|Amazon, Retail stores, Clothing"
  "6|Bills & Utilities|💡|#3498DB|Electric, Water, Internet, Phone"
  "7|Healthcare|🏥|#E74C3C|Hospitals, Pharmacies, Doctors"
  "8|Travel|✈️|#1ABC9C|Hotels, Airlines, Airbnb"
  "9|Education|📚|#2ECC71|Schools, Universities, Online courses"
  "10|Services|🔧|#95A5A6|Repairs, Cleaning, Salons"
  "11|Subscriptions|📱|#E67E22|Monthly memberships, Recurring services"
  "12|Transfers|💸|#34495E|Yappy, Bank transfers, P2P payments"
  "13|Investment|📈|#27AE60|Admiral Markets, Brokers, Trading platforms"
  "14|Pago Mensual|💳|#8E44AD|Loan payments, Mortgages, Financing"
  "15|Other|📦|#95A5A6|Uncategorized transactions"
)

CREATED=0
ERRORS=0

for category in "${CATEGORIES[@]}"; do
  IFS='|' read -r id name icon color description <<< "$category"

  # Create JSON payload
  JSON=$(cat <<EOF
{
  "name": "CreateCategory",
  "variables": {
    "id": ${id},
    "name": "${name}",
    "icon": "${icon}",
    "color": "${color}",
    "description": "${description}",
    "isDefault": true
  }
}
EOF
)

  # Make request
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "${JSON}")

  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | head -n-1)

  if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ ${icon} ${name}"
    ((CREATED++))
  else
    echo "❌ ${icon} ${name} (HTTP ${HTTP_CODE})"
    echo "   Error: ${BODY}"
    ((ERRORS++))
  fi
done

echo ""
echo "📊 Summary:"
echo "   ✅ Created: ${CREATED}"
echo "   ❌ Errors: ${ERRORS}"
echo "   📦 Total: ${#CATEGORIES[@]}"
echo ""

if [ $CREATED -gt 0 ]; then
  echo "✨ Success! Refresh your dashboard to see the categories."
fi
