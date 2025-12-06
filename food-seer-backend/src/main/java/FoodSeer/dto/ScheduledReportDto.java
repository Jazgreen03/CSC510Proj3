package FoodSeer.dto;

public class ScheduledReportDto {
    private String email;
    private String frequency; // DAILY, WEEKLY, MONTHLY

    public ScheduledReportDto() {}

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getFrequency() { return frequency; }
    public void setFrequency(String frequency) { this.frequency = frequency; }
}
