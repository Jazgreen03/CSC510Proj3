package FoodSeer.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * DTO for chat response from Ollama.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ChatResponseDto {
    /** The AI's response message */
    private String message;

    /** If true, the backend is asking for clarification from the user */
    private Boolean clarify;

    /** If present, the ID of a matched food recommendation */
    private Long matchedFoodId;
}

