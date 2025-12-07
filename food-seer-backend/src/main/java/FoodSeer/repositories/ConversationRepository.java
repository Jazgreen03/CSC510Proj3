package FoodSeer.repositories;

import FoodSeer.entity.Conversation;
import FoodSeer.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Long> {
    List<Conversation> findByUserOrderByCreatedAtAsc(User user);
    
    List<Conversation> findByUserOrderByCreatedAtDesc(User user);
}
