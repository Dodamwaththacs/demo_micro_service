package chamika.ProductService.service;

import chamika.ProductService.model.Product;
import chamika.ProductService.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductService {
    private final ProductRepository productRepository;

    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }

    public Product getProductById(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found with ID: " + id));
    }

    public Product createProduct(Product product) {
        return productRepository.save(product);
    }

    public Product reduceStock(Long id, Integer quantity) {
        Product product = getProductById(id);
        if (product.getStock() < quantity) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, 
                    "Insufficient stock for product: " + product.getName() + 
                    " (Available: " + product.getStock() + ", Requested: " + quantity + ")");
        }
        product.setStock(product.getStock() - quantity);
        return productRepository.save(product);
    }
}
