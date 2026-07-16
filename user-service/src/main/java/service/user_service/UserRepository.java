package service.user_service;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface UserRepository
                extends JpaRepository<User, Long>,
                JpaSpecificationExecutor<User> {

        Optional<User> findByEmailIgnoreCase(
                        String email);

        boolean existsByEmailIgnoreCase(
                        String email);

        boolean existsByEmailIgnoreCaseAndIdNot(
                        String email,
                        Long id);
}