package FoodSeer.service.impl;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import FoodSeer.dto.InventoryDto;
import FoodSeer.dto.OrderDto;
import FoodSeer.entity.Food;
import FoodSeer.entity.Order;
import FoodSeer.exception.ResourceNotFoundException;
import FoodSeer.mapper.OrderMapper;
import FoodSeer.entity.User;
import FoodSeer.repositories.FoodRepository;
import FoodSeer.repositories.OrderRepository;
import FoodSeer.service.InventoryService;
import FoodSeer.service.OrderService;
import FoodSeer.service.UserService;

/**
 * Implementation of the OrderService interface for managing food orders.
 */
@Service
public class OrderServiceImpl implements OrderService {

    /** Repository for food items. */
    @Autowired
    private FoodRepository foodRepository;

    /** Repository for orders. */
    @Autowired
    private OrderRepository orderRepository;

    /** Inventory service for stock management. */
    @Autowired
    private InventoryService inventoryService;

    /** User service for getting current user. */
    @Autowired
    private UserService userService;

    /**
     * Creates an order with the given information.
     *
     * @param orderDto order to create
     * @return created order
     */
    @Override
    public OrderDto createOrder(final OrderDto orderDto) {
        final List<Food> foods = new ArrayList<>();

    // Count how many of each food is in the order
    Map<Long, Long> foodCounts = orderDto.getFoods().stream()
        .collect(Collectors.groupingBy(Food::getId, Collectors.counting()));

    for (Map.Entry<Long, Long> entry : foodCounts.entrySet()) {
        Long foodId = entry.getKey();
        Long quantityNeeded = entry.getValue();

        Food food = foodRepository.findById(foodId)
                .orElseThrow(() -> new ResourceNotFoundException("Food not found with id " + foodId));

        // Check if enough stock
        if (food.getAmount() < quantityNeeded) {
            throw new IllegalArgumentException("Not enough stock for " + food.getFoodName()
                    + ". Needed: " + quantityNeeded + ", Available: " + food.getAmount());
        }

        // Deduct stock immediately
        food.setAmount((int) (food.getAmount() - quantityNeeded));
        foodRepository.save(food);

        // Add the food multiple times based on quantity
        for (int i = 0; i < quantityNeeded; i++) {
            foods.add(food);
        }
    }

    // Create order
    final Order order = new Order();
    order.setCreatedAt(java.time.LocalDateTime.now());
    order.setName(orderDto.getName());
    order.setFoods(foods);
    order.setIsFulfilled(false);

    // Assign user
    final User currentUser = userService.getCurrentUser();
    if (currentUser == null) {
        throw new IllegalStateException("No authenticated user found");
    }
    order.setUser(currentUser);

    final Order savedOrder = orderRepository.save(order);
    return OrderMapper.mapToOrderDto(savedOrder);
}

    /**
     * Returns the order with the given id.
     *
     * @param orderId order's id
     * @return the order with the given id
     * @throws ResourceNotFoundException if the order doesn't exist
     */
    @Override
    public OrderDto getOrderById(final Long orderId) {
        final Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order does not exist with id " + orderId));
        return OrderMapper.mapToOrderDto(order);
    }

    /**
     * Returns a list of all the orders.
     *
     * @return all the orders
     */
    @Override
    public List<OrderDto> getAllOrders() {
        final List<Order> orders = orderRepository.findAll();
        return orders.stream().map(OrderMapper::mapToOrderDto).collect(Collectors.toList());
    }

    /**
     * Fulfills the order by checking food availability and updating inventory.
     *
     * @param orderId The id of the order to fulfill
     * @return the updated OrderDto
     */
    @Override
    public OrderDto fulfillOrder(final long orderId) {
        final Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order does not exist with id " + orderId));

        // Count how many of each food is in the order
        final Map<Long, Long> foodCounts = order.getFoods().stream()
                .collect(Collectors.groupingBy(Food::getId, Collectors.counting()));

        // Check inventory and deduct quantities
        for (final Map.Entry<Long, Long> entry : foodCounts.entrySet()) {
            final Long foodId = entry.getKey();
            final Long quantityNeeded = entry.getValue();
            
            final Food food = foodRepository.findById(foodId)
                    .orElseThrow(() -> new ResourceNotFoundException("Food not found with id " + foodId));
            
            // Check if enough stock
            if (food.getAmount() < quantityNeeded) {
                throw new IllegalArgumentException("Not enough stock to fulfill the order for " + food.getFoodName() 
                        + ". Need: " + quantityNeeded + ", Available: " + food.getAmount());
            }
            
            // Deduct from inventory
            food.setAmount((int) (food.getAmount() - quantityNeeded));
            foodRepository.save(food);
        }

        order.setIsFulfilled(true);
        final Order savedOrder = orderRepository.save(order);
        return OrderMapper.mapToOrderDto(savedOrder);
    }

    /**
     * Checks if all ingredients/foods for an order item are available.
     *
     * @param inventoryDto The current inventory
     * @param food         The food item to check
     * @return true if available, false otherwise
     */
    private boolean checkFoodAvailability(final InventoryDto inventoryDto, final Food food) {
        final Map<String, Food> inventoryMap = inventoryDto.getFoods().stream()
                .collect(Collectors.toMap(Food::getFoodName, f -> f));

        final Food inventoryFood = inventoryMap.get(food.getFoodName());
        return inventoryFood != null && food.getAmount() <= inventoryFood.getAmount();
    }

    /**
     * Deducts the ordered food amount from the inventory.
     *
     * @param inventoryDto The inventory data
     * @param food         The food item to deduct
     */
    private void updateInventory(final InventoryDto inventoryDto, final Food food) {
        final Map<String, Food> inventoryMap = inventoryDto.getFoods().stream()
                .collect(Collectors.toMap(Food::getFoodName, f -> f));

        final Food inventoryFood = inventoryMap.get(food.getFoodName());
        if (inventoryFood != null) {
            inventoryFood.setAmount(inventoryFood.getAmount() - food.getAmount());
        }

        inventoryService.updateInventory(inventoryDto);
    }

    /**
     * Returns all fulfilled orders.
     *
     * @return list of fulfilled orders
     */
    @Override
    public List<OrderDto> getAllFulfilledOrders() {
        return getAllOrders().stream()
                .filter(OrderDto::getIsFulfilled)
                .collect(Collectors.toList());
    }

    /**
     * Returns all unfulfilled orders.
     *
     * @return list of unfulfilled orders
     */
    @Override
    public List<OrderDto> getAllUnfulfilledOrders() {
        return getAllOrders().stream()
                .filter(o -> !o.getIsFulfilled())
                .collect(Collectors.toList());
    }

    /**
     * Returns all orders for the current authenticated user.
     *
     * @return list of current user's orders
     */
    @Override
    public List<OrderDto> getCurrentUserOrders() {
        final User currentUser = userService.getCurrentUser();
        if (currentUser == null) {
            throw new IllegalStateException("No authenticated user found");
        }
        
        final List<Order> orders = orderRepository.findByUser(currentUser);
        return orders.stream().map(OrderMapper::mapToOrderDto).collect(Collectors.toList());
    }

    /**
     * Returns fulfilled orders for the current authenticated user.
     *
     * @return list of current user's fulfilled orders
     */
    @Override
    public List<OrderDto> getCurrentUserFulfilledOrders() {
        final User currentUser = userService.getCurrentUser();
        if (currentUser == null) {
            throw new IllegalStateException("No authenticated user found");
        }
        
        final List<Order> orders = orderRepository.findByUserAndIsFulfilled(currentUser, true);
        return orders.stream().map(OrderMapper::mapToOrderDto).collect(Collectors.toList());
    }

    /**
     * Returns unfulfilled orders for the current authenticated user.
     *
     * @return list of current user's unfulfilled orders
     */
    @Override
    public List<OrderDto> getCurrentUserUnfulfilledOrders() {
        final User currentUser = userService.getCurrentUser();
        if (currentUser == null) {
            throw new IllegalStateException("No authenticated user found");
        }
        
        final List<Order> orders = orderRepository.findByUserAndIsFulfilled(currentUser, false);
        return orders.stream().map(OrderMapper::mapToOrderDto).collect(Collectors.toList());
    }
}
