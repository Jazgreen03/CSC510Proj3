package FoodSeer.service.impl;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import FoodSeer.dto.FoodDto;
import FoodSeer.dto.InventoryDto;
import FoodSeer.entity.Food;
import FoodSeer.entity.Inventory;
import FoodSeer.entity.Order;
import FoodSeer.exception.ResourceNotFoundException;
import FoodSeer.mapper.FoodMapper;
import FoodSeer.mapper.InventoryMapper;
import FoodSeer.repositories.FoodRepository;
import FoodSeer.repositories.InventoryRepository;
import FoodSeer.repositories.OrderRepository;
import FoodSeer.service.FoodService;
import FoodSeer.service.InventoryService;
import jakarta.transaction.Transactional;

/**
 * Implementation of food service
 */
@Service
public class FoodServiceImpl implements FoodService {

    /** Connection to the repository to work with the DAO + database */
    @Autowired
    private FoodRepository foodRepository;

    /** Connection to the repository to work with the DAO + database */
    @Autowired
    private InventoryRepository  inventoryRepository;

    /** Connection to the repository to work with the DAO + database */
    @Autowired
    private InventoryService     inventoryService;
    
    /** Connection to the order repository */
    @Autowired
    private OrderRepository orderRepository;

    /**
     * Creates an food with the given information. A created food
     * needs to add to a new/existing inventory
     *
     * @param foodDto
     *            food to create
     * @return created food
     */
    @Override
    @Transactional
    public FoodDto createFood ( final FoodDto foodDto ) {

        // Check for duplicate names
        if ( isDuplicateName( foodDto.getFoodName() ) ) {
            throw new IllegalArgumentException( "The name of the new food already exists in the system." );
        }
        // check for invalid units
        if ( !isValidFood( foodDto ) ) {
            throw new IllegalArgumentException( "The provided food information is invalid." );
        }

        final Food food = FoodMapper.mapToFood( foodDto );
        final Food savedFood = foodRepository.saveAndFlush( food );

        // initialize inventory to see if it exists already or not
        final List<Inventory> inventoryList = inventoryRepository.findAll();

        if ( inventoryList.isEmpty() ) { // if inventory doesn't exist yet,
                                         // create it
            // initialize new list of foods to construct a new inventory
            // Dto
            final List<Food> foods = new ArrayList<>();
            foods.add( savedFood );
            final InventoryDto inventoryDto = new InventoryDto( 1L, foods );

            final InventoryDto createdInventoryDto = inventoryService.createInventory( inventoryDto );

            // SAVE the inventory to the repository
            final Inventory createdInventory = InventoryMapper.mapToInventory( createdInventoryDto );
            inventoryRepository.saveAndFlush( createdInventory );
            InventoryMapper.mapToInventoryDto( createdInventory );

        }
        else { // if the inventory does already exist... then get the existing
               // one and call updateInventory with it

            final Inventory inventory = inventoryRepository.getReferenceById( 1L );

            // add the savedFood to the existing inventory
            inventory.getFoods().add( savedFood );
            final InventoryDto inventoryDto = InventoryMapper.mapToInventoryDto( inventory );
            final InventoryDto createdInventoryDto = inventoryService.updateInventory( inventoryDto );

            // SAVE the inventory to the repository
            final Inventory createdInventory = InventoryMapper.mapToInventory( createdInventoryDto );
            inventoryRepository.saveAndFlush( createdInventory );
            InventoryMapper.mapToInventoryDto( createdInventory );
        }

        return FoodMapper.mapToFoodDto( savedFood );

    }

    /**
     * Returns the food with the given id.
     *
     * @param foodId
     *            food's id
     * @return the food with the given id
     * @throws ResourceNotFoundException
     *             if the food doesn't exist
     */
    @Override
    public FoodDto getFoodById ( final Long foodId ) {
        final Food food = foodRepository.findById( foodId ).orElseThrow(
                () -> new ResourceNotFoundException( "Food does not exist with id " + foodId ) );
        return FoodMapper.mapToFoodDto( food );
    }

    /**
     * Returns a list of all foods
     *
     * @return list of all foods
     */
    @Override
    public List<FoodDto> getAllFoods () {
        final List<Food> foods = foodRepository.findAll();
        return foods.stream().map( FoodMapper::mapToFoodDto ).collect( Collectors.toList() );
    }

    /**
     * Deletes the food with the given id
     *
     * @param foodId
     *            food's id
     * @throws ResourceNotFoundException
     *             if the food doesn't exist
     * @throws IllegalStateException
     *             if the food is part of an unfulfilled order
     */
    @Override
    @Transactional
    public void deleteFood ( final Long foodId ) {
        final Food food = foodRepository.findById( foodId ).orElseThrow(
                () -> new ResourceNotFoundException( "Food does not exist with id " + foodId ) );
        
        // Find all orders containing this food
        final List<Order> ordersWithFood = orderRepository.findOrdersContainingFood(food);
        
        // Check if any unfulfilled orders contain this food
        final List<Order> unfulfilledOrders = ordersWithFood.stream()
                .filter(order -> !order.getIsFulfilled())
                .collect(Collectors.toList());
        
        if (!unfulfilledOrders.isEmpty()) {
            throw new IllegalStateException("Cannot delete food that is part of unfulfilled orders. " +
                    "There are " + unfulfilledOrders.size() + " unfulfilled order(s) containing this food.");
        }
        
        // Remove the food from all fulfilled orders before deletion
        for (final Order order : ordersWithFood) {
            // Remove the food from the order's foods list
            order.getFoods().removeIf(f -> f.getId().equals(food.getId()));
            // Save and flush to update the join table immediately
            orderRepository.saveAndFlush(order);
        }
        
        // Flush all pending changes to ensure join table is updated
        orderRepository.flush();
        
        // Now safe to delete the food
        foodRepository.delete( food );
    }

    /**
     * Deletes all foods
     * First removes foods from all orders to avoid foreign key constraint violations
     */
    @Override
    @Transactional
    public void deleteAllFoods () {
        // Get all orders
        final List<Order> allOrders = orderRepository.findAll();
        
        // Remove all foods from all orders
        for (final Order order : allOrders) {
            order.getFoods().clear();
            orderRepository.saveAndFlush(order);
        }
        
        // Flush to ensure join table is updated
        orderRepository.flush();
        
        // Now safe to delete all foods
        foodRepository.deleteAll();
    }

    /**
     * Returns true if the recipe already exists in the database.
     *
     * @param name
     *            recipe's name to check
     * @return true if already in the database
     */
    @Override
    public boolean isDuplicateName ( final String name ) {
        final List<FoodDto> list = getAllFoods();
        for ( int i = 0; i < list.size(); ++i ) {
            if ( name.equals( list.get( i ).getFoodName() ) ) {
                return true;
            }
        }
        return false;
    }

    /**
     * Returns true if the recipe already exists in the database.
     *
     * @param name
     *            recipe's name to check
     * @return true if already in the database
     */
    @Override
    public FoodDto getDuplicateName ( final String name ) {
        final List<FoodDto> list = getAllFoods();
        for ( int i = 0; i < list.size(); ++i ) {
            if ( name.equals( list.get( i ).getFoodName() ) ) {
                return list.get( i );
            }
        }
        return null;

    }

    /**
     * Returns true if the food is valid.
     *
     * @param foodDto
     *            as a FoodDto object
     * @return true if valid
     */
    @Override
    public boolean isValidFood(final FoodDto foodDto) {
        if (foodDto == null) {
            return false;
        }

        // foodName must not be null or blank
        if (foodDto.getFoodName() == null || foodDto.getFoodName().trim().isEmpty()) {
            return false;
        }

        // amount must be >= 0
        if (foodDto.getAmount() < 0) {
            return false;
        }

        // price must be >= 0
        if (foodDto.getPrice() < 0) {
            return false;
        }

        // allergies array can be null, but cannot contain null/blank entries
        final List<String> allergies = foodDto.getAllergies();
        if (allergies != null) {
            for (final String a : allergies) {
                if (a == null || a.trim().isEmpty()) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * update the food's inventory amount and saves the updated food
     * to the food repository AND the inventory repository
     */
    @Override
    @Transactional
    public FoodDto updateFood(final String name, final int amount, final int price, final List<String> allergies) {
        // check for invalid units
        if (amount < 0) {
            throw new IllegalArgumentException("The units of the food must be a positive integer.");
        }

        // check for invalid price
        if (price < 0) {
            throw new IllegalArgumentException("The price of the food must be a non-negative integer.");
        }
        // if the food name exists currently
        if ( isDuplicateName( name ) ) {

            final FoodDto foodDto = getDuplicateName( name );
            // update with the new entries
            foodDto.setAmount( amount );
            foodDto.setPrice(price);
            foodDto.setAllergies(allergies);

            final Food food = FoodMapper.mapToFood( foodDto );
            final Food savedFood = foodRepository.saveAndFlush( food );

            return FoodMapper.mapToFoodDto( savedFood );

        }
        else {
            throw new ResourceNotFoundException( "Food does not exist with name " + name );
        }

    }

}
