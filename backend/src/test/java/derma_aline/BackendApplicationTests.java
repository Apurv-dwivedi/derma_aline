package derma_aline;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test")
public class BackendApplicationTests {

    @Autowired
    private ApplicationContext applicationContext;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void contextLoadsAndFlywaySchemaValidates() {
        assertNotNull(applicationContext);
        Integer migrationsCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM flyway_schema_history WHERE success = TRUE", Integer.class);
        assertTrue(migrationsCount != null && migrationsCount >= 2,
                "Flyway migrations V1 and V2 must execute cleanly against Hibernate ddl-auto=validate");
    }
}
