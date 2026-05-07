// 系统标准字段定义
export const SYSTEM_FIELDS = [
  { key: 'refCode', label: '外部编码', required: false, description: '外部系统订单唯一编号，用于去重' },
  { key: 'senderName', label: '发件人姓名', required: true, description: '寄件人姓名' },
  { key: 'senderPhone', label: '发件人电话', required: true, description: '寄件人联系方式' },
  { key: 'senderAddress', label: '发件人地址', required: true, description: '寄件人完整地址' },
  { key: 'receiverName', label: '收件人姓名', required: true, description: '收货人姓名' },
  { key: 'receiverPhone', label: '收件人电话', required: true, description: '收货人联系方式' },
  { key: 'receiverAddress', label: '收件人地址', required: true, description: '收货人完整地址' },
  { key: 'weight', label: '重量(kg)', required: true, description: '货物重量，必须为正数' },
  { key: 'itemQuantity', label: '件数', required: true, description: '包裹数量，必须为正整数' },
  { key: 'tempZone', label: '温层', required: true, description: '常温 / 冷藏 / 冷冻' },
  { key: 'remark', label: '备注', required: false, description: '附加说明' },
];

// 温层可选值
export const TEMP_ZONE_OPTIONS = ['常温', '冷藏', '冷冻'];

// 智能映射关键词词典（基于实际模板分析）
export const MAPPING_DICTIONARY = {
  refCode: ['外部编码', '外部订单号', '客户单号', 'ref code', 'ref', '订单号', '编码', '单号'],
  senderName: ['发件人姓名', '发件人', '发货人', '寄件人', 'sender', '寄件人姓名'],
  senderPhone: ['发件人电话', '发件电话', '发货电话', '寄件电话', 'sender tel', '寄件人手机', '发件手机'],
  senderAddress: ['发件人地址', '发件地址', '发货地址', '寄件地址', 'sender address', '寄件人地址'],
  receiverName: ['收件人姓名', '收件人', '收货人', '签收人', 'receiver', '收件人姓名'],
  receiverPhone: ['收件人电话', '收件电话', '收货电话', 'receiver tel', '收件手机', '联系电话'],
  receiverAddress: ['收件人地址', '收件地址', '收货地址', '目的地', 'receiver address'],
  weight: ['重量', '重量(kg)', '重量(KG)', 'weight', 'weight(kg)', 'kg'],
  itemQuantity: ['件数', '数量', 'qty', 'quantity', '包裹数', '箱数'],
  tempZone: ['温层', '温度要求', 'temp zone', '温度', '温区'],
  remark: ['备注', '附言', 'note', '说明', '留言', 'remark', 'memo'],
};

// 付款方式（备用）
export const PAYMENT_METHODS = ['寄付', '到付', '月结'];

// DB 名称
export const DB_NAME = 'waybill_db';
export const DB_VERSION = 1;
export const STORE_ORDERS = 'orders';
export const STORE_TEMPLATES = 'templates';
