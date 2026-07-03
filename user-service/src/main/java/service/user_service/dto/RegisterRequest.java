package service.user_service.dto;

import lombok.Data;

@Data
public class RegisterRequest {

    private String name;
    private String email;
    private String phone;
    private String password;
}