import React, { useEffect, useState } from "react";

function TopRatedFoods({ username }) {
  const [topRated, setTopRated] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  const fetchTopRated = async () => {
    try {
      const response = await fetch(`/api/feedback/top-rated/${username}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch top-rated foods');
      const data = await response.json();
      setTopRated(data);
    } catch (err) {
      console.error('Error fetching highest rated foods:', err);
    } finally {
      setLoading(false);
    }
  };

  fetchTopRated();
}, [username]);


  const renderStars = (rating) => "★★★★★".slice(0, rating) + "☆☆☆☆☆".slice(0, 5 - rating);


  if (loading) return <p aria-label="Loading top rated foods" tabIndex="0">Loading your top rated foods...</p>;

  return (
    <div className="top-rated-section" style={{ marginTop: "2rem" }} aria-label="Top rated foods section" tabIndex="0">
      <h2 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "1rem" }} aria-label="Highest rated foods heading" tabIndex="0">
        ⭐ Your Highest Rated Foods
      </h2>

      {topRated.length === 0 ? (
        <p aria-label="No ratings message" tabIndex="0">You haven't rated anything yet. Rate meals to improve your recommendations!</p>
      ) : (
        <div
          className="top-rated-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "1rem"
          }}
          aria-label="Grid of top rated foods"
          tabIndex="0"
        >
          {topRated.map((item) => (
            <div
              key={item.id}
              className="food-card"
              style={{
                padding: "1rem",
                borderRadius: "12px",
                background: "#fff",
                boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
              }}
              aria-label={`Food card for ${item.recommendedFoodItem}`}
              tabIndex="0"
            >
              {/* Image */}
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.recommendedFoodItem}
                  style={{
                    width: "100%",
                    height: "150px",
                    objectFit: "cover",
                    borderRadius: "10px",
                    marginBottom: "0.75rem"
                  }}
                  aria-label={`Image of ${item.recommendedFoodItem}`}
                  tabIndex="0"
                />
              )}

              {/* Name */}
              <h3 style={{ marginBottom: "0.3rem" }} aria-label={`Food name: ${item.recommendedFoodItem}`} tabIndex="0">{item.recommendedFoodItem}</h3>

              {/* Stars */}
              <div style={{ color: "#FFD700", fontSize: "1.2rem", marginBottom: "0.5rem" }} aria-label={`Rating: ${item.rating} out of 5 stars`} tabIndex="0">
                {renderStars(item.rating)}
              </div>

              {/* Optional review text */}
              {item.review && (
                <p style={{ fontStyle: "italic", fontSize: "0.9rem", color: "#555" }} aria-label={`Review: ${item.review}`} tabIndex="0">
                  "{item.review}"
                </p>
              )}

              {/* Date */}
              <p style={{ fontSize: "0.8rem", color: "#aaa", marginTop: "0.5rem" }} aria-label={`Rated on ${new Date(item.createdAt).toLocaleDateString()}`} tabIndex="0">
                Rated on: {new Date(item.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TopRatedFoods;