package chamika.PaymentService.service;

import chamika.PaymentService.model.Payment;
import chamika.PaymentService.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PaymentService {
    private final PaymentRepository paymentRepository;

    public Payment processPayment(Payment payment) {
        if (payment.getOrderId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order ID is required for payment processing");
        }

        payment.setStatus("PROCESSING");

        // Format Card Number (extract last 4 digits)
        if (payment.getCardNumberLast4() != null && payment.getCardNumberLast4().length() >= 4) {
            String fullCard = payment.getCardNumberLast4().replaceAll("\\s+", "");
            payment.setCardNumberLast4("**** **** **** " + fullCard.substring(fullCard.length() - 4));
        } else {
            payment.setCardNumberLast4("**** **** **** 4242");
        }

        if (payment.getCardHolder() == null || payment.getCardHolder().trim().isEmpty()) {
            payment.setCardHolder("Demo Cardholder");
        }

        if (payment.getPaymentMethod() == null) {
            payment.setPaymentMethod("CREDIT_CARD");
        }

        // Generate realistic Transaction Reference ID
        payment.setTransactionId("TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        payment.setStatus("COMPLETED");

        return paymentRepository.save(payment);
    }

    public Payment getPaymentByOrderId(Long orderId) {
        Payment payment = paymentRepository.findByOrderId(orderId);
        if (payment == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No payment record found for Order ID: " + orderId);
        }
        return payment;
    }
}
