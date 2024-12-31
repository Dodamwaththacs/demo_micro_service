package chamika.OrderService.orderService;

import chamika.OrderService.model.PaymentRequest;
import chamika.OrderService.repository.OrderRepository;
import chamika.OrderService.model.Order;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
@RequiredArgsConstructor
public class OrderService {
    private final OrderRepository orderRepository;
    private final RestTemplate restTemplate;

    @Value("${payment.service.url:http://localhost:8081}")

    private String paymentServiceUrl;

    public Order createOrder(Order order) {
        order.setStatus("PENDING");
        Order savedOrder = orderRepository.save(order);

        // Call payment service
        restTemplate.postForObject(
                paymentServiceUrl +
                "/api/payments",
                new PaymentRequest(savedOrder.getId(), savedOrder.getTotalAmount()),
                String.class
        );

        return savedOrder;
    }

    public Order getOrder(Long id) {
        return orderRepository.findById(id).orElseThrow();
    }
}

