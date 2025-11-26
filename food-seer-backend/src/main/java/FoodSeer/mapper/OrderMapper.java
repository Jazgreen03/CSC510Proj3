package FoodSeer.mapper;

import java.util.stream.Collectors;

import FoodSeer.dto.OrderDto;
import FoodSeer.dto.FoodDto;
import FoodSeer.entity.Order;
import FoodSeer.entity.Food;

/**
 * Mapper class for converting between Order and OrderDto.
 */
public class OrderMapper {

    /**
     * Converts an Order entity to an OrderDto.
     *
     * @param order the Order entity to convert
     * @return the corresponding OrderDto
     */
    public static OrderDto mapToOrderDto(final Order order) {
        final OrderDto dto = new OrderDto(order.getId(), order.getName());

        // Map Food entities to FoodDto and add them
        dto.setFoods(order.getFoods().stream()
                .map(FoodMapper::mapToFoodDto)
                .map(foodDto -> new Food(
                        foodDto.getFoodName(),
                        foodDto.getAmount(),
                        foodDto.getPrice(),
                        foodDto.getAllergies()))
                .collect(Collectors.toList()));

        dto.setIsFulfilled(order.getIsFulfilled());
                dto.setCreatedAt(order.getCreatedAt());
        return dto;
    }

    /**
     * Converts an OrderDto to an Order entity.
     *
     * @param orderDto the OrderDto to convert
     * @return the corresponding Order entity
     */
    public static Order mapToOrder(final OrderDto orderDto) {
        final Order order = new Order(orderDto.getId(), orderDto.getName());

        // Map FoodDto objects to Food entities
        order.setFoods(orderDto.getFoods().stream()
                .map(food -> new Food(
                        food.getFoodName(),
                        food.getAmount(),
                        food.getPrice(),
                        food.getAllergies()))
                .collect(Collectors.toList()));

        order.setIsFulfilled(orderDto.getIsFulfilled());
                order.setCreatedAt(orderDto.getCreatedAt());
        return order;
    }
}
