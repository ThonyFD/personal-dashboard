#!/bin/bash
# Quick script to populate categories using Firebase Data Connect API

echo "🔑 Getting access token..."
TOKEN=$(~/google-cloud-sdk/bin/gcloud auth print-access-token)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get access token"
  exit 1
fi

PROJECT_ID="mail-reader-433802"
LOCATION="us-central1"
SERVICE="personal-dashboard"
CONNECTOR="default"

BASE_URL="https://firebasedataconnect.googleapis.com/v1beta/projects/${PROJECT_ID}/locations/${LOCATION}/services/${SERVICE}/connectors/${CONNECTOR}"

echo "✅ Token obtained"
echo "📝 Creating categories..."
echo ""

# Array of categories
categories=(
  '1|Food & Dining|🍽️|#FF6B6B|Restaurants, Coffee shops, Fast food, Bars'
  '2|Groceries|🛒|#4ECB71|Supermarkets, Grocery stores'
  '3|Transportation|🚗|#4ECDC4|Uber, Gas stations, Parking, Tolls'
  '4|Entertainment|🎮|#9B59B6|Netflix, Gaming, Movies, Streaming services'
  '5|Shopping|🛍️|#F39C12|Amazon, Retail stores, Clothing'
  '6|Bills & Utilities|💡|#3498DB|Electric, Water, Internet, Phone'
  '7|Healthcare|🏥|#E74C3C|Hospitals, Pharmacies, Doctors'
  '8|Travel|✈️|#1ABC9C|Hotels, Airlines, Airbnb'
  '9|Education|📚|#2ECC71|Schools, Universities, Online courses'
  '10|Services|🔧|#95A5A6|Repairs, Cleaning, Salons'
  '11|Subscriptions|📱|#E67E22|Monthly memberships, Recurring services'
  '12|Transfers|💸|#34495E|Yappy, Bank transfers, P2P payments'
  '13|Investment|📈|#27AE60|Admiral Markets, Brokers, Trading platforms'
  '14|Pago Mensual|💳|#8E44AD|Loan payments, Mortgages, Financing'
  '15|Other|📦|#95A5A6|Uncategorized transactions'
)

created=0
errors=0

for cat in "${categories[@]}"; do
  IFS='|' read -r id name icon color desc <<< "$cat"

  response=$(curl -s "${BASE_URL}:executeMutation" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"CreateCategory\",
      \"variables\": {
        \"id\": ${id},
        \"name\": \"${name}\",
        \"icon\": \"${icon}\",
        \"color\": \"${color}\",
        \"description\": \"${desc}\",
        \"isDefault\": true
      }
    }")

  if echo "$response" | grep -q "error"; then
    echo "❌ ${icon} ${name}"
    echo "   Error: $response"
    ((errors++))
  else
    echo "✅ ${icon} ${name}"
    ((created++))
  fi
done

echo ""
echo "📊 Summary:"
echo "   Created: $created"
echo "   Errors: $errors"
echo ""

if [ $created -gt 0 ]; then
  echo "✨ Success! Refresh your dashboard."
fi
