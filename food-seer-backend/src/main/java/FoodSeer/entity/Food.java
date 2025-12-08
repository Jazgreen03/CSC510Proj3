package FoodSeer.entity;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * This class represents a Food entity.
 */
@Entity
@Table ( name = "foods" )
public class Food {

    /**
     * Id for the class
     */
    @Id
    @GeneratedValue ( strategy = GenerationType.IDENTITY )
    private Long id;

    /**
     * Name of the food
     */
    private String foodName;

    /**
     * Field representing the amount of the food
     */
    private int amount;

    /**
     * Price of the food
     */
    private int price;

    /**
     * List representing allergies associated with the food
     */
    @ElementCollection(fetch = FetchType.EAGER)
    private List<String> allergies = new ArrayList<>();

    /**
     * List of tags for flexible filtering (e.g., VEGETARIAN, VEGAN, SPICY, MILD, CHINESE, ITALIAN, DESSERT, HOT, COLD, etc.)
     */
    @ElementCollection(fetch = FetchType.EAGER)
    private List<String> tags = new ArrayList<>();

    /**
     * Constructor for Hibernate
     */
    public Food () {
        super();
    }

    /**
     * Constructor with params
     *
     * @param id
     *            The ID of the food
     * @param name
     *            Name of the food
     * @param amount
     *            The amount of the food
     * @param price
     *            The price of the food
     * @param allergies
     *            The list of allergies associated with the food
     */
    public Food ( final String name, final int amount, final int price, final List<String> allergies ) {
        super();
        this.foodName = name.toUpperCase();
        this.amount = amount;
        this.price = price;

        this.allergies = new ArrayList<>();
        for ( final String allergy : allergies ) {
            this.allergies.add( allergy.toUpperCase() );
        }
    }

    /**
     * Get ID
     *
     * @return The id
     */
    public Long getId () {
        return id;
    }

    /**
     * Set Id to @param id
     *
     * @param id
     *            The id to set
     */
    public void setId ( final Long id ) {
        this.id = id;
    }

    /**
     * Get food name
     *
     * @return the food name
     */
    public String getFoodName () {
        return foodName;
    }

    /**
     * Sets the food name to @param name
     *
     * @param name
     *            The name to set
     */
    public void setFoodName ( final String name ) {
        this.foodName = name;
    }

    /**
     * Gets the amount field
     *
     * @return The amount field
     */
    public int getAmount () {
        return amount;
    }

    /**
     * Sets the amount field to @param amount
     *
     * @param amount
     *            The amount to set
     */
    public void setAmount ( final int amount ) {
        this.amount = amount;
    }

    /**
     * Gets the price field
     *
     * @return The price of the food
     */
    public int getPrice () {
        return price;
    }

    /**
     * Sets the price field to @param price
     *
     * @param price
     *            The price to set
     */
    public void setPrice ( final int price ) {
        this.price = price;
    }

    /**
     * Gets the allergies associated with the food
     *
     * @return The allergies list
     */
    public List<String> getAllergies () {
        return allergies;
    }

    /**
     * Sets the allergies list to @param allergies
     *
     * @param allergies
     *            The allergies to set
     */
    public void setAllergies ( final List<String> allergies ) {
        this.allergies = allergies;
    }

    /**
     * Gets the tags associated with the food
     *
     * @return The tags list
     */
    public List<String> getTags () {
        return tags;
    }

    /**
     * Sets the tags list to @param tags
     *
     * @param tags
     *            The tags to set
     */
    public void setTags ( final List<String> tags ) {
        this.tags = tags;
    }
}
