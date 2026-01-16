#!/bin/bash

# Configuration
GITHUB_TOKEN="${GITHUB_TOKEN}"
GEMINI_API_KEY="${GEMINI_API_KEY}"
REPO="${GITHUB_REPOSITORY}"
PR_NUMBER="${PR_NUMBER}"
MIN_DESC_LENGTH=50
MIN_TITLE_LENGTH=10
API_URL="https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent"
USER_NAME="${USER_NAME:-AnkanSaha}"
LANGUAGE="${LANGUAGE:-hinglish}"

# Check for API Key
if [[ -z "$GEMINI_API_KEY" ]]; then
  echo "GEMINI_API_KEY is not set. Skipping."
  exit 0
fi

echo "Processing PR #${PR_NUMBER} in ${REPO}"

# 1. Get PR Details
PR_RESPONSE=$(curl -s -H "Authorization: token ${GITHUB_TOKEN}" \
  "https://api.github.com/repos/${REPO}/pulls/${PR_NUMBER}")

CURRENT_BODY=$(echo "$PR_RESPONSE" | jq -r '.body // ""')
CURRENT_TITLE=$(echo "$PR_RESPONSE" | jq -r '.title // ""')

# Handle null body
if [[ "$CURRENT_BODY" == "null" ]]; then CURRENT_BODY=""; fi

echo "Current Title: $CURRENT_TITLE"
echo "Current Body Length: ${#CURRENT_BODY}"

# 2. Check if update is needed
NEEDS_DESC=false
if [[ "${#CURRENT_BODY}" -lt $MIN_DESC_LENGTH ]]; then
  NEEDS_DESC=true
  echo "Description is too short. Will generate."
else
  echo "Description is sufficient."
fi

# We always analyze for title, quality, and suggestions, but only update description if needed.
# Actually, user wants "full code quality check" and "suggestions". 
# Even if description is long enough, we might want to append the quality check?
# The user said: "if user write the PR Description then it was fine but if dont have ... then ... update"
# BUT in the latest request: "also add @AnkanSha ... also doo a full code quality check"
# It implies these new sections should probably be added regardless, OR only when we are generating.
# Given "if user write ... it was fine", I will stick to: Only touch it if description is short/missing.
# HOWEVER, the user *also* said "update the PR Title if it too short".
# So I will proceed if EITHER title is bad OR description is short.

if [[ "$NEEDS_DESC" == "false" ]]; then
   # If description is fine, we might still need to check title.
   # But we can't easily check title quality without AI. 
   # So we proceed to fetch diff and ask AI, but we tell AI to keep description null if not needed.
   echo "Checking if title needs improvement..."
fi

# 3. Fetch Diff
DIFF=$(curl -s -L -H "Authorization: token ${GITHUB_TOKEN}" \
  -H "Accept: application/vnd.github.v3.diff" \
  "https://api.github.com/repos/${REPO}/pulls/${PR_NUMBER}")

if [[ -z "$DIFF" ]]; then
  echo "Diff is empty. Exiting."
  exit 0
fi

# Truncate diff to avoid hitting limits (approx 100k chars)
TRUNCATED_DIFF=${DIFF:0:100000}

# 4. Prepare Gemini Payload
# We use jq to safely create the JSON payload to avoid escaping issues
jq -n \
  --arg diff "$TRUNCATED_DIFF" \
  --arg title "$CURRENT_TITLE" \
  --arg needs_desc "$NEEDS_DESC" \
  --arg user_name "$USER_NAME" \
  --arg lang "$LANGUAGE" \
  '{
    contents: [{
      parts: [{
        text: ("You are an expert software engineer and code reviewer. Analyze the following git diff and PR title.\n\n" +
               "Current Title: \"" + $title + "\"\n" +
               "Needs Description: " + $needs_desc + "\n" +
               "Language Preference: " + $lang + "\n\n" +
               "Task:\n" +
               "1. **Evaluate Title**: If current title is short (<10 chars), generic, or unrelated, generate a new concise type-based title (feat:, fix:, etc). Otherwise return null.\n" +
               "2. **Generate Description**: If Needs Description is true, generate a VERY LONG, DETAILED, and COMPREHENSIVE description (Summary, Key Changes, Technical Details).\n" +
               "3. **Code Quality Check**: Perform a strict code quality check. Look for bugs, security issues, performance bottlenecks, and bad practices.\n" +
               "4. **Suggestion**: Provide a specific recommendation for user @" + $user_name + ". Should this be merged? Does it need improvements? Be specific.\n" +
               "5. **Review Comment**: Write a constructive code review comment addressed to @" + $user_name + ". \n" +
               "   - **Tone**: Act like a Senior Engineer mentoring a Junior. Be friendly but strict about quality. Use emojis 🚀 🐛 🎨.\n" +
               "   - **Language**: If Language Preference is \"english\", write in standard professional English. \n" +
               "     If it is NOT \"english\" (default), write in **Hinglish** (Hindi + English mix) and go into **FULL PRANK MODE** 🤡. \n" +
               "     - Be funny, sarcastic, and roast the code a little bit (in a friendly way). \n" +
               "     - Use words like \"Bhai kya kar raha hai tu?\", \"Ye kya bawasir bana diya?\", \"Chacha chaudhary mat ban\", \"Jugaad\". \n" +
               "     - Example: \"Arre bhai, ye loop dekh ke meri aankhein jal gayin 🔥. Isko fix kar warna production fat jayega aur boss teri class lega 😂.\"\n" +
               "   - **Content**: Point out specific improvements, potential bugs, or best practices. If the code looks great, say something encouraging in the requested language.\n\n" +
               "Git Diff:\n" + $diff + "\n\n" +
               "**IMPORTANT**: Output ONLY a valid JSON object with this structure:\n" +
               "{\n" +
               "  \"new_title\": \"string or null\",\n" +
               "  \"description\": \"string or null\",\n" +
               "  \"quality_check\": \"string\",\n" +
               "  \"suggestion\": \"string\",\n" +
               "  \"review_comment\": \"string\"\n" +
               "}")
      }]
    }]
  }' > payload.json

echo "Sending request to Gemini..."
RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d @payload.json)

# 5. Parse Response
# Extract text content. The response might contain markdown code blocks for json.
GENERATED_TEXT=$(echo "$RESPONSE" | jq -r '.candidates[0].content.parts[0].text // empty')

if [[ -z "$GENERATED_TEXT" ]]; then
  echo "Failed to get response from Gemini."
  echo "Raw Response: $RESPONSE"
  exit 1
fi

# Clean up markdown code blocks if present (remove ```json and ```)
CLEAN_JSON=$(echo "$GENERATED_TEXT" | sed 's/```json//g' | sed 's/```//g')

# Parse fields
NEW_TITLE=$(echo "$CLEAN_JSON" | jq -r '.new_title // empty')
NEW_DESC=$(echo "$CLEAN_JSON" | jq -r '.description // empty')
QUALITY=$(echo "$CLEAN_JSON" | jq -r '.quality_check // empty')
SUGGESTION=$(echo "$CLEAN_JSON" | jq -r '.suggestion // empty')
REVIEW_COMMENT=$(echo "$CLEAN_JSON" | jq -r '.review_comment // empty')

if [[ "$NEW_TITLE" == "null" ]]; then NEW_TITLE=""; fi
if [[ "$NEW_DESC" == "null" ]]; then NEW_DESC=""; fi

# 6. Construct Update Payload
UPDATE_JSON="{}"

# Update Title if generated
if [[ -n "$NEW_TITLE" ]]; then
  echo "Updating Title to: $NEW_TITLE"
  UPDATE_JSON=$(echo "$UPDATE_JSON" | jq --arg t "$NEW_TITLE" '. + {title: $t}')
fi

# Update Body if generated OR if we just want to append the quality check/suggestions
# The user request implies "update the PR Description with full details" if short.
# But "also add @AnkanSha ... also doo a full code quality check".
# If the description was already long enough, we probably shouldn't overwrite it, 
# BUT we might want to append the quality check? 
# To be safe and follow "if user write ... it was fine", I will ONLY update the body 
# if NEEDS_DESC was true. 
# However, if I don't update the body, I can't add the @AnkanSha suggestion.
# Let's assume if NEEDS_DESC is false, we DO NOT touch the body at all, as per original instruction.
# Wait, "also add @AnkanSha ... with me ... give me suggestion".
# If I don't add it to the body, where does it go? A comment?
# The prompt says "update the PR Description".
# I will stick to: Only update body if it was short.
# IF the body is short, I will construct the FULL body with all sections.

if [[ -n "$NEW_DESC" ]]; then
  FULL_BODY="$NEW_DESC"
  
  if [[ -n "$QUALITY" ]]; then
    FULL_BODY="$FULL_BODY

## 🔍 Code Quality Check
$QUALITY"
  fi
  
  if [[ -n "$SUGGESTION" ]]; then
    FULL_BODY="$FULL_BODY

## 💡 Suggestion for @$USER_NAME
$SUGGESTION"
  fi
  
  FULL_BODY="$FULL_BODY

---
*Auto-generated by Gemini AI*"
  
  # Escape for JSON
  UPDATE_JSON=$(echo "$UPDATE_JSON" | jq --arg b "$FULL_BODY" '. + {body: $b}')
fi

# Check if there is anything to update
if [[ "$UPDATE_JSON" == "{}" ]]; then
  echo "No updates needed."
  exit 0
fi

echo "Updating PR..."
curl -s -X PATCH -H "Authorization: token ${GITHUB_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$UPDATE_JSON" \
  "https://api.github.com/repos/${REPO}/pulls/${PR_NUMBER}"

# 7. Post Review Comment (if exists)
if [[ -n "$REVIEW_COMMENT" ]]; then
  echo "Posting Review Comment..."
  # Use jq to safely escape the comment
  COMMENT_PAYLOAD=$(jq -n --arg body "$REVIEW_COMMENT" '{body: $body}')
  
  curl -s -X POST -H "Authorization: token ${GITHUB_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$COMMENT_PAYLOAD" \
    "https://api.github.com/repos/${REPO}/issues/${PR_NUMBER}/comments"
fi

echo "Done."
