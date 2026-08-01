const ticketCategories = {
    'support': {
        label: '🎫 Hỗ trợ',
        namePrefix: 'ho-tro',
        description: 'Bảo hành, khiếu nại hoặc thắc mắc về đơn hàng.',
        emoji: '🎫',
        fields: [
            { id: 'order_info', label: 'Đơn hàng cần hỗ trợ', placeholder: '(bảo hành - thắc mắc)', style: 1, required: true },
            { id: 'reason', label: 'Chi tiết yêu cầu hỗ trợ', placeholder: 'Mô tả chi tiết vấn đề của bạn...', style: 2, required: true }
        ]
    },
    'billing': {
        label: '🛒 Mua hàng',
        namePrefix: 'mua-hang',
        description: 'Tạo đơn mua hàng mới tại DOTTIE INC.',
        emoji: '🛒',
        fields: [
            { id: 'order_name', label: 'Tên đơn hàng', placeholder: 'Nhập tên sản phẩm bạn muốn mua', style: 1, required: true },
            { id: 'payment_method', label: 'Phương thức thanh toán', placeholder: 'Ví dụ: MoMo, MB Bank, ZaloPay...', style: 1, required: true },
            { id: 'note', label: 'Lưu ý thêm cho sốp', placeholder: 'Ví dụ: Cần hàng gấp, lời chúc...', style: 2, required: false }
        ]
    }
};

function getCategoryLabel(category) {
    return ticketCategories[category]?.label || 'Không xác định';
}

module.exports = { ticketCategories, getCategoryLabel };
