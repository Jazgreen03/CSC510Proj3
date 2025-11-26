package FoodSeer.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import FoodSeer.dto.ScheduledReportDto;

@Service
public class ScheduledReportService {
    private static final Logger logger = LoggerFactory.getLogger(ScheduledReportService.class);

    private final List<ScheduledReportDto> scheduled = new ArrayList<>();

    public void register(final ScheduledReportDto dto) {
        scheduled.add(dto);
        logger.info("Registered scheduled report: {} {}", dto.getEmail(), dto.getFrequency());
    }

    // Simple periodic runner (every minute) to simulate scheduled reports.
    @Scheduled(fixedRate = 60000)
    public void runScheduled() {
        if (scheduled.isEmpty()) return;
        logger.info("ScheduledReportService running at {} — {} reports registered", LocalDateTime.now(), scheduled.size());
        for (final ScheduledReportDto dto : scheduled) {
            // This service no longer sends email; it only logs that a scheduled report would have been sent.
            logger.info("(no-email) Would generate snapshot for {} with frequency {}", dto.getEmail(), dto.getFrequency());
        }
    }

    /**
     * Demo send-now: previously sent email. Now kept as a log-only operation to avoid email features.
     */
    public void sendNow(final String email) {
        logger.info("[sendNow][no-email] Requested snapshot for {} (email feature removed)", email);
    }
}
