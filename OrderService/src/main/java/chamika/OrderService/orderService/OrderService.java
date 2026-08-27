package chamika.OrderService.orderService;

import chamika.OrderService.model.Order;
import chamika.OrderService.model.ProductDto;
import chamika.OrderService.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class OrderService {
    private final OrderRepository orderRepository;
    private final RestTemplate restTemplate;

    @Value("${product.service.url:http://localhost:8083/api/products}")
    private String productServiceUrl;

    public Order createOrder(Order order) {
        int qty = (order.getQuantity() != null && order.getQuantity() > 0) ? order.getQuantity() : 1;
        order.setQuantity(qty);

        // 1. If productId is provided, fetch product info and reduce inventory stock
        if (order.getProductId() != null) {
            try {
                // Get Product Info
                ProductDto product = restTemplate.getForObject(
                        productServiceUrl + "/" + order.getProductId(),
                        ProductDto.class
                );
                if (product != null) {
                    order.setProductName(product.getName());
                    if (order.getTotalAmount() == null || order.getTotalAmount() <= 0) {
                        order.setTotalAmount(product.getPrice() * qty);
                    }

                    // Deduct stock in ProductService
                    restTemplate.put(
                            productServiceUrl + "/" + order.getProductId() + "/reduce-stock?quantity=" + qty,
                            null
                    );
                }
            } catch (Exception e) {
                System.err.println("Warning: Could not contact ProductService: " + e.getMessage());
            }
        }

        if (order.getProductName() == null || order.getProductName().isEmpty()) {
            order.setProductName("General Order Item");
        }

        // Set initial state to PENDING_PAYMENT (Awaiting Customer Card Payment)
        order.setStatus("PENDING_PAYMENT");
        return orderRepository.save(order);
    }

    public Order getOrder(Long id) {
        return orderRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found with ID: " + id));
    }

    public Order updateOrderStatus(Long id, String status) {
        Order order = getOrder(id);
        order.setStatus(status);
        return orderRepository.save(order);
    }
}
