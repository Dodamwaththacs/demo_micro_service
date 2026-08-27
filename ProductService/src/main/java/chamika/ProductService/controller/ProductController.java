package chamika.ProductService.controller;

import chamika.ProductService.model.Product;
import chamika.ProductService.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {
    private final ProductService productService;

    @GetMapping
    public ResponseEntity<List<Product>> getAllProducts() {
        return ResponseEntity.ok(productService.getAllProducts());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Product> getProductById(@PathVariable Long id) {
        return ResponseEntity.ok(productService.getProductById(id));
    }

    @PostMapping
    public ResponseEntity<Product> createProduct(@RequestBody Product product) {
        return ResponseEntity.ok(productService.createProduct(product));
    }

    @PutMapping("/{id}/reduce-stock")
    public ResponseEntity<Product> reduceStock(
            @PathVariable Long id,
            @RequestParam(defaultValue = "1") Integer quantity
    ) {
        return ResponseEntity.ok(productService.reduceStock(id, quantity));
    }
}
