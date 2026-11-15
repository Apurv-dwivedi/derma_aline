package derma_aline;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@ComponentScan(basePackages = {"derma_aline", "com.dermaaline.backend"})
@EnableJpaRepositories(basePackages = {"com.dermaaline.backend.repository"})
@EntityScan(basePackages = {"com.dermaaline.backend.entity"})
public class BackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);
    }
}