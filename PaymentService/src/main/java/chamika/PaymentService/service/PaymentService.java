package chamika.PaymentService.service;

import chamika.PaymentService.model.Payment;
import chamika.PaymentService.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PaymentService {
    private final PaymentRepository paymentRepository;

    public Payment processPayment(Payment payment) {
        payment.setStatus("PROCESSING");
        // Add payment processing logic here
        payment.setStatus("COMPLETED");
        return paymentRepository.save(payment);
    }

    public Payment getPaymentByOrderId(Long orderId) {
        return paymentRepository.findByOrderId(orderId);
    }
}
