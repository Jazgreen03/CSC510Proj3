#!/bin/bash

# Seed Recommendation Ratings Script
# This script populates the recommendation_feedback table with diverse sample data

DB_NAME="food_seer_test"
DB_USER="root"
DB_PASS="root@123"

echo "🌱 Seeding recommendation ratings data..."

# First, get some user IDs and food names from the database
mysql -u $DB_USER -p$DB_PASS $DB_NAME << 'EOF'

-- Clear existing recommendation feedback
DELETE FROM recommendation_feedback;

-- Insert diverse recommendation ratings
-- We'll create ratings for various foods with different ratings (1-5 stars)

-- Get user IDs (we'll use the first few users)
SET @user1 = (SELECT id FROM users LIMIT 1);
SET @user2 = (SELECT id FROM users LIMIT 1 OFFSET 1);
SET @user3 = (SELECT id FROM users LIMIT 1 OFFSET 2);

-- High-rated foods (4-5 stars)
INSERT INTO recommendation_feedback (user_id, recommended_food_item, rating, created_at) VALUES
(@user1, 'PIZZA', 5, NOW() - INTERVAL 1 DAY),
(@user2, 'PIZZA', 5, NOW() - INTERVAL 2 DAY),
(@user3, 'PIZZA', 4, NOW() - INTERVAL 3 DAY),
(@user1, 'BURGER', 5, NOW() - INTERVAL 1 DAY),
(@user2, 'BURGER', 4, NOW() - INTERVAL 2 DAY),
(@user3, 'BURGER', 5, NOW() - INTERVAL 4 DAY),
(@user1, 'SUSHI', 5, NOW() - INTERVAL 1 DAY),
(@user2, 'SUSHI', 5, NOW() - INTERVAL 3 DAY),
(@user3, 'SUSHI', 4, NOW() - INTERVAL 5 DAY),
(@user1, 'PASTA', 4, NOW() - INTERVAL 2 DAY),
(@user2, 'PASTA', 5, NOW() - INTERVAL 3 DAY),
(@user3, 'PASTA', 4, NOW() - INTERVAL 1 DAY);

-- Medium-rated foods (3 stars)
INSERT INTO recommendation_feedback (user_id, recommended_food_item, rating, created_at) VALUES
(@user1, 'SALAD', 3, NOW() - INTERVAL 1 DAY),
(@user2, 'SALAD', 3, NOW() - INTERVAL 2 DAY),
(@user3, 'SALAD', 3, NOW() - INTERVAL 3 DAY),
(@user1, 'SANDWICH', 3, NOW() - INTERVAL 2 DAY),
(@user2, 'SANDWICH', 3, NOW() - INTERVAL 1 DAY),
(@user1, 'SOUP', 3, NOW() - INTERVAL 3 DAY),
(@user2, 'SOUP', 3, NOW() - INTERVAL 4 DAY);

-- Low-rated foods (1-2 stars) - quality concerns
INSERT INTO recommendation_feedback (user_id, recommended_food_item, rating, created_at) VALUES
(@user1, 'HOTDOG', 2, NOW() - INTERVAL 1 DAY),
(@user2, 'HOTDOG', 2, NOW() - INTERVAL 2 DAY),
(@user3, 'HOTDOG', 1, NOW() - INTERVAL 3 DAY),
(@user1, 'NACHOS', 2, NOW() - INTERVAL 1 DAY),
(@user2, 'NACHOS', 1, NOW() - INTERVAL 2 DAY),
(@user1, 'FRIES', 2, NOW() - INTERVAL 3 DAY),
(@user2, 'FRIES', 2, NOW() - INTERVAL 1 DAY);

-- Additional diverse ratings for better distribution
INSERT INTO recommendation_feedback (user_id, recommended_food_item, rating, created_at) VALUES
(@user1, 'TACOS', 4, NOW() - INTERVAL 1 DAY),
(@user2, 'TACOS', 5, NOW() - INTERVAL 2 DAY),
(@user3, 'TACOS', 4, NOW() - INTERVAL 3 DAY),
(@user1, 'RAMEN', 5, NOW() - INTERVAL 1 DAY),
(@user2, 'RAMEN', 4, NOW() - INTERVAL 2 DAY),
(@user1, 'STEAK', 5, NOW() - INTERVAL 1 DAY),
(@user2, 'STEAK', 5, NOW() - INTERVAL 3 DAY),
(@user1, 'CHICKEN', 4, NOW() - INTERVAL 2 DAY),
(@user2, 'CHICKEN', 4, NOW() - INTERVAL 1 DAY),
(@user3, 'CHICKEN', 3, NOW() - INTERVAL 4 DAY),
(@user1, 'RICE', 3, NOW() - INTERVAL 2 DAY),
(@user2, 'RICE', 3, NOW() - INTERVAL 3 DAY),
(@user1, 'NOODLES', 4, NOW() - INTERVAL 1 DAY),
(@user2, 'NOODLES', 3, NOW() - INTERVAL 2 DAY),
(@user1, 'CURRY', 5, NOW() - INTERVAL 1 DAY),
(@user2, 'CURRY', 4, NOW() - INTERVAL 3 DAY),
(@user3, 'CURRY', 5, NOW() - INTERVAL 2 DAY);

-- Show summary
SELECT 
    'Total Ratings' as Metric, 
    COUNT(*) as Count 
FROM recommendation_feedback
UNION ALL
SELECT 
    CONCAT('★', rating, ' Stars') as Metric,
    COUNT(*) as Count
FROM recommendation_feedback
GROUP BY rating
ORDER BY Metric;

SELECT 
    recommended_food_item as Food,
    COUNT(*) as Reviews,
    ROUND(AVG(rating), 2) as AvgRating
FROM recommendation_feedback
GROUP BY recommended_food_item
ORDER BY AvgRating DESC, Reviews DESC
LIMIT 10;

EOF

echo ""
echo "✅ Recommendation ratings seeded successfully!"
echo ""
echo "📊 Summary:"
echo "   - High-rated foods (4-5★): PIZZA, BURGER, SUSHI, PASTA, TACOS, RAMEN, STEAK, CURRY"
echo "   - Medium-rated foods (3★): SALAD, SANDWICH, SOUP, CHICKEN, RICE, NOODLES"
echo "   - Low-rated foods (1-2★): HOTDOG, NACHOS, FRIES"
echo ""
echo "🎯 Now refresh your Analytics Dashboard to see the recommendation ratings charts!"