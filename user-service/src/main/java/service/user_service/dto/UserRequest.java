package service.user_service.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserRequest {

    private String name;

    private String email;

    private String phone;

    /*
     * Bắt buộc khi tạo.
     * Không bắt buộc khi cập nhật.
     */
    private String password;

    private String role;
}