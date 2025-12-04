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


  if (loading) return <p>Loading your top rated foods...</p>;

  return (
    <div className="top-rated-section" style={{ marginTop: "2rem" }}>
      <h2 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "1rem" }}>
        ⭐ Your Highest Rated Foods
      </h2>

      {topRated.length === 0 ? (
        <p>You haven't rated anything yet. Rate meals to improve your recommendations!</p>
      ) : (
        <div
          className="top-rated-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "1rem"
          }}
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
                />
              )}

              {/* Name */}
              <h3 style={{ marginBottom: "0.3rem" }}>{item.recommendedFoodItem}</h3>

              {/* Stars */}
              <div style={{ color: "#FFD700", fontSize: "1.2rem", marginBottom: "0.5rem" }}>
                {renderStars(item.rating)}
              </div>

              {/* Optional review text */}
              {item.review && (
                <p style={{ fontStyle: "italic", fontSize: "0.9rem", color: "#555" }}>
                  “{item.review}”
                </p>
              )}

              {/* Date */}
              <p style={{ fontSize: "0.8rem", color: "#aaa", marginTop: "0.5rem" }}>
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
