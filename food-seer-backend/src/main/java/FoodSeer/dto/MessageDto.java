package FoodSeer.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Simple message DTO for conversation history
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class MessageDto {
    private String role; // e.g., "user" or "assistant"
    private String content;
}
