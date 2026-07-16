package com.example.notification_service.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.ExchangeBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.boot.autoconfigure.amqp.SimpleRabbitListenerContainerFactoryConfigurer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

        public static final String BOOKING_EXCHANGE = "booking.exchange";

        public static final String PAYMENT_EXCHANGE = "payment.exchange";

        public static final String TICKET_EXCHANGE = "ticket.exchange";

        public static final String NOTIFICATION_DEAD_LETTER_EXCHANGE = "notification.dlx";

        public static final String BOOKING_CREATED_ROUTING_KEY = "booking.created";

        public static final String BOOKING_CANCELLED_ROUTING_KEY = "booking.cancelled";

        public static final String PAYMENT_SUCCESS_ROUTING_KEY = "payment.success";

        public static final String PAYMENT_FAILED_ROUTING_KEY = "payment.failed";

        public static final String TICKET_ISSUED_ROUTING_KEY = "ticket.issued";

        public static final String BOOKING_CREATED_QUEUE = "notification.booking.created.queue";

        public static final String BOOKING_CANCELLED_QUEUE = "notification.booking.cancelled.queue";

        public static final String PAYMENT_SUCCESS_QUEUE = "notification.payment.success.queue";

        public static final String PAYMENT_FAILED_QUEUE = "notification.payment.failed.queue";

        public static final String TICKET_ISSUED_QUEUE = "notification.ticket.issued.queue";

        public static final String BOOKING_CREATED_DLQ = "notification.booking.created.dlq";

        public static final String BOOKING_CANCELLED_DLQ = "notification.booking.cancelled.dlq";

        public static final String PAYMENT_SUCCESS_DLQ = "notification.payment.success.dlq";

        public static final String PAYMENT_FAILED_DLQ = "notification.payment.failed.dlq";

        public static final String TICKET_ISSUED_DLQ = "notification.ticket.issued.dlq";

        public static final String BOOKING_CREATED_DLQ_KEY = "notification.booking.created.dead";

        public static final String BOOKING_CANCELLED_DLQ_KEY = "notification.booking.cancelled.dead";

        public static final String PAYMENT_SUCCESS_DLQ_KEY = "notification.payment.success.dead";

        public static final String PAYMENT_FAILED_DLQ_KEY = "notification.payment.failed.dead";

        public static final String TICKET_ISSUED_DLQ_KEY = "notification.ticket.issued.dead";

        @Bean
        public TopicExchange bookingExchange() {
                return ExchangeBuilder
                                .topicExchange(
                                                BOOKING_EXCHANGE)
                                .durable(true)
                                .build();
        }

        @Bean
        public TopicExchange paymentExchange() {
                return ExchangeBuilder
                                .topicExchange(
                                                PAYMENT_EXCHANGE)
                                .durable(true)
                                .build();
        }

        @Bean
        public TopicExchange ticketExchange() {
                return ExchangeBuilder
                                .topicExchange(
                                                TICKET_EXCHANGE)
                                .durable(true)
                                .build();
        }

        @Bean
        public TopicExchange notificationDeadLetterExchange() {
                return ExchangeBuilder
                                .topicExchange(
                                                NOTIFICATION_DEAD_LETTER_EXCHANGE)
                                .durable(true)
                                .build();
        }

        @Bean
        public Queue bookingCreatedQueue() {
                return createMainQueue(
                                BOOKING_CREATED_QUEUE,
                                BOOKING_CREATED_DLQ_KEY);
        }

        @Bean
        public Queue bookingCancelledQueue() {
                return createMainQueue(
                                BOOKING_CANCELLED_QUEUE,
                                BOOKING_CANCELLED_DLQ_KEY);
        }

        @Bean
        public Queue paymentSuccessQueue() {
                return createMainQueue(
                                PAYMENT_SUCCESS_QUEUE,
                                PAYMENT_SUCCESS_DLQ_KEY);
        }

        @Bean
        public Queue paymentFailedQueue() {
                return createMainQueue(
                                PAYMENT_FAILED_QUEUE,
                                PAYMENT_FAILED_DLQ_KEY);
        }

        @Bean
        public Queue ticketIssuedQueue() {
                return createMainQueue(
                                TICKET_ISSUED_QUEUE,
                                TICKET_ISSUED_DLQ_KEY);
        }

        @Bean
        public Binding bookingCreatedBinding() {
                return BindingBuilder
                                .bind(
                                                bookingCreatedQueue())
                                .to(
                                                bookingExchange())
                                .with(
                                                BOOKING_CREATED_ROUTING_KEY);
        }

        @Bean
        public Binding bookingCancelledBinding() {
                return BindingBuilder
                                .bind(
                                                bookingCancelledQueue())
                                .to(
                                                bookingExchange())
                                .with(
                                                BOOKING_CANCELLED_ROUTING_KEY);
        }

        @Bean
        public Binding paymentSuccessBinding() {
                return BindingBuilder
                                .bind(
                                                paymentSuccessQueue())
                                .to(
                                                paymentExchange())
                                .with(
                                                PAYMENT_SUCCESS_ROUTING_KEY);
        }

        @Bean
        public Binding paymentFailedBinding() {
                return BindingBuilder
                                .bind(
                                                paymentFailedQueue())
                                .to(
                                                paymentExchange())
                                .with(
                                                PAYMENT_FAILED_ROUTING_KEY);
        }

        @Bean
        public Binding ticketIssuedBinding() {
                return BindingBuilder
                                .bind(
                                                ticketIssuedQueue())
                                .to(
                                                ticketExchange())
                                .with(
                                                TICKET_ISSUED_ROUTING_KEY);
        }

        @Bean
        public Queue bookingCreatedDeadLetterQueue() {
                return QueueBuilder
                                .durable(
                                                BOOKING_CREATED_DLQ)
                                .build();
        }

        @Bean
        public Queue bookingCancelledDeadLetterQueue() {
                return QueueBuilder
                                .durable(
                                                BOOKING_CANCELLED_DLQ)
                                .build();
        }

        @Bean
        public Queue paymentSuccessDeadLetterQueue() {
                return QueueBuilder
                                .durable(
                                                PAYMENT_SUCCESS_DLQ)
                                .build();
        }

        @Bean
        public Queue paymentFailedDeadLetterQueue() {
                return QueueBuilder
                                .durable(
                                                PAYMENT_FAILED_DLQ)
                                .build();
        }

        @Bean
        public Queue ticketIssuedDeadLetterQueue() {
                return QueueBuilder
                                .durable(
                                                TICKET_ISSUED_DLQ)
                                .build();
        }

        @Bean
        public Binding bookingCreatedDeadLetterBinding() {
                return BindingBuilder
                                .bind(
                                                bookingCreatedDeadLetterQueue())
                                .to(
                                                notificationDeadLetterExchange())
                                .with(
                                                BOOKING_CREATED_DLQ_KEY);
        }

        @Bean
        public Binding bookingCancelledDeadLetterBinding() {
                return BindingBuilder
                                .bind(
                                                bookingCancelledDeadLetterQueue())
                                .to(
                                                notificationDeadLetterExchange())
                                .with(
                                                BOOKING_CANCELLED_DLQ_KEY);
        }

        @Bean
        public Binding paymentSuccessDeadLetterBinding() {
                return BindingBuilder
                                .bind(
                                                paymentSuccessDeadLetterQueue())
                                .to(
                                                notificationDeadLetterExchange())
                                .with(
                                                PAYMENT_SUCCESS_DLQ_KEY);
        }

        @Bean
        public Binding paymentFailedDeadLetterBinding() {
                return BindingBuilder
                                .bind(
                                                paymentFailedDeadLetterQueue())
                                .to(
                                                notificationDeadLetterExchange())
                                .with(
                                                PAYMENT_FAILED_DLQ_KEY);
        }

        @Bean
        public Binding ticketIssuedDeadLetterBinding() {
                return BindingBuilder
                                .bind(
                                                ticketIssuedDeadLetterQueue())
                                .to(
                                                notificationDeadLetterExchange())
                                .with(
                                                TICKET_ISSUED_DLQ_KEY);
        }

        @Bean
        public Jackson2JsonMessageConverter jackson2JsonMessageConverter(
                        ObjectMapper objectMapper) {
                return new Jackson2JsonMessageConverter(
                                objectMapper);
        }

        @Bean
        public SimpleRabbitListenerContainerFactory rabbitListenerContainerFactory(
                        SimpleRabbitListenerContainerFactoryConfigurer configurer,
                        ConnectionFactory connectionFactory,
                        Jackson2JsonMessageConverter messageConverter) {
                SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();

                configurer.configure(
                                factory,
                                connectionFactory);

                factory.setMessageConverter(
                                messageConverter);

                factory.setDefaultRequeueRejected(
                                false);

                factory.setConcurrentConsumers(1);
                factory.setMaxConcurrentConsumers(5);
                factory.setPrefetchCount(20);

                return factory;
        }

        private Queue createMainQueue(
                        String queueName,
                        String deadLetterRoutingKey) {
                return QueueBuilder
                                .durable(queueName)
                                .withArgument(
                                                "x-dead-letter-exchange",
                                                NOTIFICATION_DEAD_LETTER_EXCHANGE)
                                .withArgument(
                                                "x-dead-letter-routing-key",
                                                deadLetterRoutingKey)
                                .build();
        }
}