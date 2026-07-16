package service.user_service.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserAuthResponse {

    private Long id;

    private String name;

    private String email;

    private String phone;

    private String password;

    private String role;
}