package chamika.ProductService.config;

import chamika.ProductService.model.Product;
import chamika.ProductService.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {
    private final ProductRepository productRepository;

    @Override
    public void run(String... args) throws Exception {
        if (productRepository.count() == 0) {
            productRepository.saveAll(List.of(
                new Product(null, "Laptop Pro 16", "High performance M3 Max workstation for developers", 1499.99, 10),
                new Product(null, "Wireless Headphones", "Active Noise Cancelling Bluetooth 5.3 Over-Ear Headphones", 199.50, 25),
                new Product(null, "Ergonomic Keyboard", "Wireless Mechanical Split Keyboard with RGB backlighting", 89.00, 15),
                new Product(null, "4K Monitor 27-inch", "Ultra HD 144Hz IPS Display with USB-C Hub", 349.00, 8)
            ));
        }
    }
}
