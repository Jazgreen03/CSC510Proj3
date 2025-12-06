package FoodSeer.entity;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import jakarta.persistence.Column;

/**
 * Represents an Order in the FoodSeer system.
 * Each order can contain multiple foods, and can be marked as fulfilled or not.
 */
@Entity
@Table(name = "orders")
public class Order {

    /** Order ID */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Order name */
    private String name;

    /** User who created this order */
    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** List of foods in the order */
    @ManyToMany
    private List<Food> foods = new ArrayList<>();

    /** Boolean used to track if the order has been fulfilled */
    private boolean isFulfilled;

    /**
     * Timestamp when the order was created. Used for analytics/trends.
     */
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    /**
     * Default constructor for Hibernate.
     */
    public Order() {
        // Default constructor
    }

    /**
     * Creates an Order with the given ID and name.
     *
     * @param id   the order ID
     * @param name the order name
     */
    public Order(final Long id, final String name) {
        this.id = id;
        this.name = name;
        this.foods = new ArrayList<>();
        this.isFulfilled = false;
    }

    /**
     * Gets the created timestamp.
     *
     * @return creation time
     */
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    /**
     * Sets the created timestamp.
     *
     * @param createdAt creation time
     */
    public void setCreatedAt(final LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    /**
     * Gets the order ID.
     *
     * @return the order ID
     */
    public Long getId() {
        return id;
    }

    /**
     * Sets the order ID (used by Hibernate).
     *
     * @param id the order ID
     */
    @SuppressWarnings("unused")
    private void setId(final Long id) {
        this.id = id;
    }

    /**
     * Gets the name of the order.
     *
     * @return the order name
     */
    public String getName() {
        return name;
    }

    /**
     * Sets the name of the order.
     *
     * @param name the order name
     */
    public void setName(final String name) {
        this.name = name;
    }

    /**
     * Adds a food item to the order.
     *
     * @param food the food to add
     */
    public void addFood(final Food food) {
        this.foods.add(food);
    }

    /**
     * Gets the list of foods in the order.
     *
     * @return the list of foods
     */
    public List<Food> getFoods() {
        return this.foods;
    }

    /**
     * Sets the list of foods in the order.
     *
     * @param foods the list of foods
     */
    public void setFoods(final List<Food> foods) {
        this.foods = foods;
    }

    /**
     * Checks if the order is fulfilled.
     *
     * @return true if fulfilled, false otherwise
     */
    public boolean getIsFulfilled() {
        return isFulfilled;
    }

    /**
     * Sets whether the order is fulfilled.
     *
     * @param isFulfilled true if fulfilled, false otherwise
     */
    public void setIsFulfilled(final boolean isFulfilled) {
        this.isFulfilled = isFulfilled;
    }

    /**
     * Gets the user who created this order.
     *
     * @return the user
     */
    public User getUser() {
        return user;
    }

    /**
     * Sets the user who created this order.
     *
     * @param user the user
     */
    public void setUser(final User user) {
        this.user = user;
    }
}
