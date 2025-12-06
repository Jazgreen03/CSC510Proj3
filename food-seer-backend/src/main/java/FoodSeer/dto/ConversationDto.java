package FoodSeer.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ConversationDto {
    private Long id;
    private String messageContent;
    private String role; // USER or ASSISTANT
    private LocalDateTime createdAt;
}
