# --- Thư viện ---
import os
from PIL import Image, ImageOps
from tqdm import tqdm 
import torch
import numpy as np
from transformers import AutoImageProcessor, AutoModel
import json
import time
from sklearn.manifold import TSNE
from sklearn.decomposition import PCA
from sklearn.preprocessing import MinMaxScaler
import umap

# Gỡ bỏ giới hạn pixel cho ảnh độ phân giải lớn
Image.MAX_IMAGE_PIXELS = None  


# --- Cấu hình chung ---
INPUT_FOLDER = "public/test" # Folder input
THUMB_FOLDER = "public/thumbnail" # Folder output
THUMB_SIZE = 256 # Kích thước cạnh lớn nhất
THUMB_QUALITY = 80 # Giữ lại chất lượng 80%

# Hàm tạo thumbnail
def create_thumbnails(input_dir, output_dir):
    """
    Hàm tạo ảnh thu nhỏ tối ưu cho dự án 
    Sử dụng thuật toán Lanczos để ảnh thu nhỏ nhưng vẫn giữ độ chi tiết cao

    Args:
        input_dir (_type_): _description_
        output_dir (_type_): _description_
    """
    # Kiểm tra và tạo thư mục nếu chưa có
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # Danh sách file ảnh gốc hợp lệ
    valid_exts = ('.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff')
    files = [f for f in os.listdir(input_dir) if f.lower().endswith(valid_exts)]
    
    count = 0
    for filename in tqdm(files, desc="🔨 Creating Thumbnails", unit="img"):
        # Đường dẫn tuyệt đối của file ảnh
        src_path = os.path.join(input_dir, filename)
        # Lấy tên ảnh + đuôi file mới
        dst_name = os.path.splitext(filename)[0] + ".webp"
        # Đường dẫn tuyệt đối mới = đường dẫn output + filename.webp
        dst_path = os.path.join(output_dir, dst_name)

        # Nếu ảnh thumbnail đã có rồi thì bỏ qua luôn, không mở ảnh gốc ra nữa
        if os.path.exists(dst_path):
            continue

        try:
            # Mở ảnh gốc
            with Image.open(src_path) as img:
                # Convert qua RGB: Vì ảnh PNG có kênh Alpha (trong suốt)
                img = img.convert("RGB")

                # Tránh xoay ảnh
                img = ImageOps.exif_transpose(img)
                
                # Giữ nguyên tỉ lệ, chỉ thu nhỏ sao cho vừa khung THUMB_SIZE x THUMB_SIZE
                img.thumbnail((THUMB_SIZE, THUMB_SIZE), Image.Resampling.LANCZOS)

                # Lưu ảnh
                img.save(dst_path, "WEBP", quality=THUMB_QUALITY)
                count += 1
        except Exception as e:
            print(f"❌ Lỗi file {filename}: {e}")

class FeatureExtractor:
    def __init__(self,model_name='facebook/dinov2-base'):
        """
        Khởi tạo mô hình AI.
        Load model một lần duy nhất để dùng đi dùng lại.
        """      
        # Ưu tiên: CUDA (NVIDIA) -> MPS (Mac Silicon) -> CPU
        if torch.cuda.is_available():
            self.device = "cuda"
            print(f"🧠 Đang tải model: {model_name} lên 🚀 GPU NVIDIA (CUDA)")
        elif torch.backends.mps.is_available():
            self.device = "mps"
            print(f"🧠 Đang tải model: {model_name} lên 🍎 Apple Silicon GPU (MPS)")
        else:
            self.device = "cpu"
            print(f"🧠 Đang tải model: {model_name} lên ⚠️ CPU (Sẽ chậm hơn)")
        
        # Processor: Giúp chuẩn hoá màu sắc (Normalize) theo chuẩn ImageNet
        try:
            self.processor = AutoImageProcessor.from_pretrained(model_name, use_fast=True)
        except:
            # Fallback nếu máy không cài thư viện hỗ trợ fast
            self.processor = AutoImageProcessor.from_pretrained(model_name, use_fast=False)

        # Model: Mạng nơ-ron thực hiện tính toán
        self.model = AutoModel.from_pretrained(model_name).to(self.device)

        # Chuyển toàn bộ trọng số model sang FP16
        self.model = self.model.half() 

        # Chuyển sang chế độ 'eval' (Evaluation)
        # Báo cho model biết ta đang dùng để dự đoán, không phải để train.
        # Giúp khóa các tham số lại, chạy nhanh hơn và ổn định hơn.
        self.model.eval()

    def _smart_resize(self, image, max_side=1024, patch_size=14):
        """
        Xử lý kích thước ảnh thông minh:
        1. Nếu ảnh quá to (> max_side), thu nhỏ lại giữ tỷ lệ.
        2. Đảm bảo kích thước cuối cùng chia hết cho 14.
        """
        w, h = image.size
        
        # --- BƯỚC 1: GIỚI HẠN KÍCH THƯỚC (QUAN TRỌNG) ---
        # Nếu cạnh lớn nhất vượt quá max_side, ta phải thu nhỏ nó lại
        # Scale về max_side
        if max(w, h) > max_side:
            ratio = max_side / max(w, h)
            w = int(w * ratio)
            h = int(h * ratio)
        
        # --- BƯỚC 2: CHIA HẾT CHO 14 ---
        # Làm tròn xuống bội số gần nhất của 14
        # Đảm bảo 2 canh chia hết cho 14
        new_w = (w // patch_size) * patch_size
        new_h = (h // patch_size) * patch_size
        
        # Đảm bảo không bị về 0
        new_w = max(new_w, patch_size)
        new_h = max(new_h, patch_size)
        
        # Chỉ resize nếu kích thước thay đổi
        if (new_w, new_h) != image.size:
            # print(f"   -> Resize từ {image.size} về {(new_w, new_h)}") # Uncomment để debug
            return image.resize((new_w, new_h), resample=Image.Resampling.LANCZOS)
        
        return image

    def extract(self, images, input_size=1024):
        """
        Hàm chính: Nhận vào 1 ảnh PIL -> Trả về Vector (Numpy Array).
        """
        is_batch = isinstance(images, list) # Kiểm tra xem có phải là danh sách không
        
        # 1. Xử lý Resize (Hỗ trợ cả đơn lẻ và danh sách)
        if is_batch:
            # Nếu là list, chạy smart_resize cho từng ảnh trong list
            processed_imgs = [self._smart_resize(img, max_side=input_size) for img in images]
        else:
            # Nếu là ảnh đơn, chạy bình thường
            processed_imgs = self._smart_resize(images, max_side=input_size)
        
        # 2. Preprocess (Thư viện tự hiểu List hoặc Single Image)
        inputs = self.processor(
            images=processed_imgs, 
            return_tensors="pt", 
            do_resize=False, 
            do_center_crop=False
        )
        
        # inputs = {k: v.to(self.device) for k, v in inputs.items()}
        # Thử với FP16
        inputs = {k: v.to(self.device).half() for k, v in inputs.items()}

        # 3. Inference
        with torch.no_grad():
            outputs = self.model(**inputs)
        
        # 4. Lấy kết quả
        # OPTION: Lựa chọn khác "Average Pooling"
        last_hidden_states = outputs.last_hidden_state
        embedding = last_hidden_states[:, 0, :] # Lấy CLS Token
        
        # 5. Trả về kết quả (Xử lý chiều dữ liệu)
        # .float() để chuyển từ FP16 về lại FP32 trước khi sang CPU/Numpy
        result = embedding.float().cpu().numpy()
        
        if is_batch:
            return result # Trả về mảng 2 chiều (N, 1024)
        else:
            return result.flatten() # Trả về mảng 1 chiều (1024,)

class ImageSlicer:
    # OPTION: window_size phải bội của 14
    # overlap_ratio = 20%
    def __init__(self, window_size=518, overlap_ratio=0.2):
        """
        Công cụ cắt ảnh thành các mảnh nhỏ (Tiles).
        Args:
            window_size: Kích thước mỗi mảnh (Nên là 518 cho DINOv2).
            overlap_ratio: Tỷ lệ chồng lấn (0.2 = 20%).
        """
        self.window_size = window_size
        self.overlap_ratio = overlap_ratio
        
        # Stride: Bước nhảy của cửa sổ trượt
        # Nếu window=518, overlap=0.2 -> stride ≈ 414 pixel.
        # Nghĩa là cứ trượt 414px thì cắt 1 phát.
        self.stride = int(window_size * (1 - overlap_ratio))

    def _get_points(self, length):
        """
        Hàm tính toán các điểm toạ độ cắt (dùng chung cho cả chiều ngang và dọc).
        Logic: Trượt -> Trượt -> ... -> Nếu cái cuối bị hụt thì lùi lại cho đủ.
        """
        if length <= self.window_size:
            return [0] # Ảnh nhỏ hơn cửa sổ thì lấy luôn gốc toạ độ 0
            
        points = []
        current = 0
        while True:
            points.append(current)
            current += self.stride
            
            # Kiểm tra nếu bước tiếp theo bị lòi ra ngoài ảnh
            if current + self.window_size >= length:
                # Thêm điểm cuối cùng: Lấy độ dài trừ đi kích thước cửa sổ
                # Đảm bảo mảnh cuối luôn full size, không bị đen viền
                last_point = length - self.window_size
                if last_point > points[-1]: # Tránh trùng lặp nếu ảnh vừa khít
                    points.append(last_point)
                break
        return points

    def slice_generator(self, img):
        """
        Input: Ảnh PIL (High-res).
        Output: List các ảnh con (PIL Images).
        """
        width, height = img.size
        
        # Nếu ảnh nhỏ hơn cửa sổ cắt (ví dụ ảnh 400x400 mà cửa sổ 518)
        # yield chính nó rồi nghỉ
        if width <= self.window_size and height <= self.window_size:
            yield img
            return

        
        # Tính toán toạ độ lưới
        x_points = self._get_points(width)
        y_points = self._get_points(height)
        
        for y in y_points:
            for x in x_points:
                box = (x, y, x + self.window_size, y + self.window_size)
                # Cắt và trả về ngay lập tức (Yield)
                yield img.crop(box)

def run_processing_pipeline(input_folder, output_json="data_vectors.json"):
    print("\n🚀 BẮT ĐẦU QUY TRÌNH XỬ LÝ DỮ LIỆU (PIPELINE)...")
    
    # 1. Khởi tạo công cụ
    # Global cần nhìn tổng thể -> input_size to (1024)
    # Local cần nhìn chi tiết -> input_size vừa (518) khớp với window
    # OPTION: Lựa chon small, base, large, giant
    extractor = FeatureExtractor(model_name='facebook/dinov2-large')

    # OPTION: chia ảnh thành các tiles có kích thước window_size, phải bội số của 14
    # overlap_ratio=0.2 là phù hợp
    slicer = ImageSlicer(window_size=518, overlap_ratio=0.2)
    
    database = []
    
    # Lấy danh sách ảnh
    valid_exts = ('.jpg', '.jpeg', '.png', '.webp')
    files = [f for f in os.listdir(input_folder) if f.lower().endswith(valid_exts)]
    
    # Sắp xếp tên file để xử lý theo thứ tự (tùy chọn)
    files.sort()
    
    print(f"📂 Tìm thấy {len(files)} ảnh trong {input_folder}")
    
    # Vòng lặp chính (Có thanh tiến trình)
    for filename in tqdm(files, desc="🧠 Extracting Features", unit="img"):
        try:
            img_path = os.path.join(input_folder, filename)
            
            # Mở ảnh
            with Image.open(img_path) as img:
                img = img.convert('RGB')
                
                # --- A. GLOBAL FEATURE ---
                # Lấy vector toàn cảnh
                # OPTION: Ảnh global: Máy mạnh nên chạy 1526
                v_global = extractor.extract(img, input_size=1526)
                # Chuẩn hóa L2 ngay 
                v_global = v_global / np.linalg.norm(v_global)
                
                # --- B. LOCAL FEATURES (Generator + Batching) ---
                tile_gen = slicer.slice_generator(img)
                
                batch_imgs = []
                local_vectors_list = []
                # OPTION: Gom [BATCH_SIZE] ảnh con rồi quăng vào hàm extract
                BATCH_SIZE = 8 # Tùy VRAM, 8 là an toàn

                SAVE_INTERVAL = 10 # Cứ xong 50 ảnh thì lưu file 1 lần (Tránh mất điện/disconnect)
                count_since_save = 0

                for tile in tile_gen:
                    batch_imgs.append(tile)
                    
                    # Nếu gom đủ batch thì xử lý
                    if len(batch_imgs) >= BATCH_SIZE:
                        # OPTION: Nếu tăng input_size ở đây -> Phải tăng ImageSlicer(window_size=518...) ở trên 
                        batch_vecs = extractor.extract(batch_imgs, input_size=518)
                        local_vectors_list.append(batch_vecs) # batch_vecs là (N, 1024)
                        batch_imgs = [] # Reset batch
                
                # Xử lý batch lẻ cuối cùng -> Trường hợp batch_imgs < BATCH_SIZE
                if batch_imgs:
                    batch_vecs = extractor.extract(batch_imgs, input_size=518)
                    local_vectors_list.append(batch_vecs)
                
                # --- C. FUSION (Hợp nhất) ---
                if local_vectors_list:
                    # Nối tất cả các batch lại thành 1 mảng lớn (Total_Tiles, 1024)
                    all_local_matrix = np.vstack(local_vectors_list)
                    
                    # Tính trung bình cộng (Average Pooling) -> Ra (1024,)
                    v_local_mean = np.mean(all_local_matrix, axis=0)
                    v_local_mean = v_local_mean / np.linalg.norm(v_local_mean) # Chuẩn hóa
                    
                    # Công thức hợp nhất: 50% Global + 50% Local
                    final_vector = (v_global * 0.5) + (v_local_mean * 0.5)
                else:
                    # Trường hợp ảnh quá nhỏ không cắt được tile nào
                    final_vector = v_global

                # Chuẩn hóa lần cuối vector tổng hợp
                final_vector = final_vector / np.linalg.norm(final_vector)
                
                # --- D. ĐÓNG GÓI ---
                # Lưu đường dẫn tương đối để Web dùng
                # Ví dụ: filename là "A.jpg" -> path="thumbnail/A.webp"
                thumb_path = f"thumbnail/{os.path.splitext(filename)[0]}.webp"
                
                database.append({
                    "id": filename,
                    "highress_path": img_path,
                    "thumb_path": thumb_path,
                    "vector": final_vector.tolist() # Chuyển numpy -> list để lưu JSON
                })
                # --- E. CƠ CHẾ AUTO-SAVE ---
                count_since_save += 1
                if count_since_save >= SAVE_INTERVAL:
                    # Lưu file tạm thời
                    with open(output_json, 'w') as f:
                        json.dump(database, f)
                    count_since_save = 0
                    # print(f"   (Đã lưu checkpoint: {len(database)} ảnh)") # Bỏ comment nếu muốn xem log
                
        except Exception as e:
            tqdm.write(f"❌ Lỗi xử lý {filename}: {e}")

    # 4. Lưu file JSON
    print(f"💾 Đang lưu dữ liệu vào {output_json}...")
    with open(output_json, 'w') as f:
        json.dump(database, f)
    print("✅ HOÀN TẤT QUY TRÌNH!")

def generate_layout(input_file="data_vectors.json", output_file="final_structure.json"):
    print(f"\n🎨 ĐANG VẼ BẢN ĐỒ 3D TỪ {input_file}...")
    
    # 1. Đọc dữ liệu thô
    if not os.path.exists(input_file):
        print(f"❌ Không tìm thấy file {input_file}")
        return

    with open(input_file, 'r') as f:
        data = json.load(f)
    
    if not data:
        print("⚠️ File dữ liệu rỗng!")
        return

    # Tách riêng danh sách vector để tính toán
    # data[i]['vector'] đang là list, cần chuyển sang numpy array
    print("   -> Đang load vectors vào RAM...")
    vectors = np.array([item['vector'] for item in data])
    
    # 2. Chạy thuật toán UMAP (Giảm từ 1024D -> 3D)
    print("   -> Đang chạy UMAP (Việc này tốn chút thời gian)...")
    
    # --- CẤU HÌNH UMAP (QUAN TRỌNG) ---
    # OPTION
    reducer = umap.UMAP(
        n_components=3,    # Đích đến là 3D (x, y, z)
        n_neighbors=30,    # Nhìn 30 hàng xóm để định vị (Số to -> Cấu trúc toàn cục rõ hơn)
        min_dist=0.1,      # Khoảng cách tối thiểu giữa các điểm (Số nhỏ -> Cụm chặt)
        metric='cosine',   # Đo góc (tốt nhất cho vector AI)
        random_state=42    # Cố định kết quả (Chạy 10 lần ra giống nhau)
    )
    
    embedding_3d = reducer.fit_transform(vectors)
    
    # 3. Hậu kỳ toạ độ (Post-processing) - "Trang điểm"
    print("   -> Đang tinh chỉnh toạ độ (Scaling & Jitter)...")
    
    # A. Scale về không gian hiển thị (Ví dụ từ -35 đến 35)
    # Đây là kích thước sân khấu của bạn trên Web
    # OPTION
    SCENE_SIZE = 20 
    scaler = MinMaxScaler(feature_range=(-SCENE_SIZE, SCENE_SIZE))
    embedding_3d = scaler.fit_transform(embedding_3d)
    
    # B. Thêm nhiễu (Jitter) để tách các ảnh trùng nhau
    # Tránh hiện tượng 2 ảnh đè lên nhau nhấp nháy
    noise_strength = 0.5 
    noise = np.random.uniform(-noise_strength, noise_strength, embedding_3d.shape)
    embedding_3d += noise
    
    # C. Kéo giãn trục Z (Chiều sâu) và Đặt lên mặt đất
    # Nhân trục Z lên 1.5 lần cho sâu hun hút
    embedding_3d[:, 2] *= 1.5 
    
    # Tịnh tiến trục Z sao cho điểm thấp nhất = 0 (Nằm trên sàn)
    min_z = np.min(embedding_3d[:, 2])
    embedding_3d[:, 2] = embedding_3d[:, 2] - min_z

    # 4. Đóng gói kết quả cuối cùng
    final_data = []
    for i, item in enumerate(data):
        final_data.append({
            "id": item['id'],
            "thumb_path": item['thumb_path'], # Giữ nguyên đường dẫn thumbnail
            "highress_path": item['highress_path'],
            "position": [
                round(float(embedding_3d[i, 0]), 3), # Làm tròn 3 số lẻ cho nhẹ JSON
                round(float(embedding_3d[i, 1]), 3),
                round(float(embedding_3d[i, 2]), 3)
            ]
        })

    # 5. Lưu file
    with open(output_file, 'w') as f:
        json.dump(final_data, f)
        
    print(f"✅ XONG! Dữ liệu Web đã sẵn sàng tại: {output_file}")
    print(f"   -> Tổng số ảnh: {len(final_data)}")
    print(f"   -> Toạ độ X, Y trong khoảng: [-{SCENE_SIZE}, {SCENE_SIZE}]")
    print(f"   -> Toạ độ Z (Độ cao): [0, {round(np.max(embedding_3d[:, 2]), 2)}]")

# main
if __name__ == "__main__":
    # Ghi lại thời điểm bắt đầu
    start_time = time.time()
    # --- BƯỚC 1: TẠO THUMBNAIL ---
    # (Nếu chạy rồi thì comment lại cho nhanh)
    # create_thumbnails(INPUT_FOLDER, THUMB_FOLDER)
    
    
    # --- BƯỚC 2: TRÍCH XUẤT ĐẶC TRƯNG (PIPELINE) ---
    # File trung gian chứa vector 1024 chiều
    VECTOR_FILE = "data_vectors.json" 
    
    # Kiểm tra xem có cần chạy lại bước nặng nhất này không
    if not os.path.exists(VECTOR_FILE):
        if os.path.exists(INPUT_FOLDER):
            run_processing_pipeline(INPUT_FOLDER, output_json=VECTOR_FILE)
        else:
            print(f"⚠️ Không tìm thấy thư mục ảnh: {INPUT_FOLDER}")
    else:
        print(f"ℹ️ Đã tìm thấy {VECTOR_FILE}. Bỏ qua bước trích xuất.")

    # --- BƯỚC 3: TẠO TOẠ ĐỘ 3D (MAPPING) ---
    # File cuối cùng cho Web
    # FINAL_FILE = "final_structure.json"
    
    # # Bước này chạy rất nhanh (vài giây), nên cứ chạy lại thoải mái
    # if os.path.exists(VECTOR_FILE):
    #     generate_layout(input_file=VECTOR_FILE, output_file=FINAL_FILE)
    # else:
    #     print("❌ Không có dữ liệu vector để vẽ bản đồ.")

    

    # Ghi lại thời điểm kết thúc
    end_time = time.time()

    # Tính thời gian chạy
    elapsed_time = end_time - start_time

    print(f"Thời gian thực thi: {elapsed_time:.4f} giây")



# TODO: outputs.last_hidden_state[:, 0, :] hiện tại đang lấy CLS TOKEN
# Nó là token được model đào tạo để tóm tắt ảnh

# TODO: một "cơ chế bảo hiểm" vào mã nguồn: Lưu tự động (Auto-save) sau mỗi 50 ảnh. -> Chạy số lượng lớn
# Nên coi lại chuẩn hoá khi SCENE_SIZE = 30 thì xy=SCENE_SIZE thooi, còn Z phải tính toán lại cho phù hoppwj
# bổ xung vào json hasing, nếu đã có bỏ qua
# thêm tính năng lọc giống bằng hasing, lọc trùng, và backup + kiểm tra đã có rồi thì bỏ qua