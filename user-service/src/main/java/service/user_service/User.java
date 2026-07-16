package service.user_service;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Locale;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "users", uniqueConstraints = {
        @UniqueConstraint(name = "uk_users_email", columnNames = "email")
}, indexes = {
        @Index(name = "idx_users_email", columnList = "email"),
        @Index(name = "idx_users_role", columnList = "role"),
        @Index(name = "idx_users_name", columnList = "name")
})
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(length = 30)
    private String phone;

    /*
     * Không để Entity tự trả password ra JSON.
     * UserAuthResponse sẽ chủ động trả password
     * cho Auth Service khi cần đăng nhập.
     */
    @JsonIgnore
    @Column(nullable = false, length = 100)
    private String password;

    @Column(nullable = false, length = 30)
    private String role;

    @PrePersist
    public void beforeInsert() {
        normalizeFields();

        if (role == null ||
                role.isBlank()) {
            role = "USER";
        }
    }

    @PreUpdate
    public void beforeUpdate() {
        normalizeFields();
    }

    private void normalizeFields() {
        if (name != null) {
            name = name.trim();
        }

        if (email != null) {
            email = email
                    .trim()
                    .toLowerCase(Locale.ROOT);
        }

        if (phone != null) {
            phone = phone.trim();

            if (phone.isBlank()) {
                phone = null;
            }
        }

        if (role != null) {
            role = role
                    .trim()
                    .replaceFirst(
                            "(?i)^ROLE_",
                            "")
                    .toUpperCase(Locale.ROOT);
        }
    }
}