package com.example.booking_service.dto;

import com.example.booking_service.entity.Booking;
import com.example.booking_service.entity.BookingItem;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BookingDetailResponse {

    private Booking booking;

    private List<BookingItem> items;
}