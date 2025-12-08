package FoodSeer.dto;

import java.util.ArrayList;
import java.util.List;
import java.time.LocalDateTime;

import FoodSeer.entity.Food;

/**
 * Data Transfer Object for Order.
 * Used to transfer Order data between the client and server.
 */
public class OrderDto {

    /** Order ID */
    private Long id;

    /** Order name */
    private String name;

    /** List of foods in the order */
    private List<Food> foods;

    /** Boolean used to track if the order has been fulfilled */
    private boolean isFulfilled;
    /** Timestamp when the order was created. */
    private LocalDateTime createdAt;

    /**
     * Default constructor for OrderDto.
     */
    public OrderDto() {
        this.foods = new ArrayList<>();
        this.isFulfilled = false;
    }

    /**
     * Creates an OrderDto with the given ID and name.
     *
     * @param id   the order ID
     * @param name the order name
     */
    public OrderDto(final Long id, final String name) {
        this.id = id;
        this.name = name;
        this.foods = new ArrayList<>();
        this.isFulfilled = false;
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
     * Sets the order ID.
     *
     * @param id the order ID
     */
    public void setId(final Long id) {
        this.id = id;
    }

    /**
     * Gets the order name.
     *
     * @return the order name
     */
    public String getName() {
        return name;
    }

    /**
     * Sets the order name.
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

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(final LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
