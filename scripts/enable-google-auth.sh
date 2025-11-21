#!/bin/bash

# Script to enable Google Sign-In in Firebase Authentication

PROJECT_ID="mail-reader-433802"

echo "=== Enabling Google Sign-In Provider ==="
echo ""
echo "Please follow these manual steps in the Firebase Console:"
echo ""
echo "1. Go to: https://console.firebase.google.com/project/${PROJECT_ID}/authentication/providers"
echo "2. Click on 'Google' in the Sign-in providers list"
echo "3. Toggle 'Enable' to ON"
echo "4. Select a support email (your email: thonyfd@gmail.com)"
echo "5. Click 'Save'"
echo ""
echo "After enabling, your app will be ready to use Google Sign-In!"
echo ""
echo "Your hosting URL: https://${PROJECT_ID}.web.app"
echo ""
