import Account from "./account.js";

export async function login(req, res) {
    const {username, password} = req.body;

    try {
        const user = await Account.findOne({
            where: { username: username }
        });
        if (!user){
            return res.status(200).json({
                status: 200,
                success: true,
                result: false,
                message: "Không tìm thấy"
            });
        }
        if (user.password === password){
            req.session.accountId = user.id;
            return res.status(200).json({
                status: 200,
                success: true,
                result: true,
                message: "Đăng nhập thành công"
            });
        }
        return res.status(200).json({
                status: 200,
                success: true,
                result: false,
                message: "Sai mật khẩu"
            });
    } catch (error) {
        return res.status(500).json({
            status: 500,
            success: false,
            message: "Lỗi server." + error.message
        });
    }
}

export async function signUp(req, res) {
    const {fName, lName, username, password} = req.body;
    try {
        const user = await Account.findOne({
            where: { username: username }
        });
        if (user){
            return res.status(200).json({
            status: 200,
            success: false,
            message: "Tên đăng nhập tồn tại"
        }); 
        }
        await Account.create({
            username : username,
            password : password,
            name : lName + " " + fName
        });
        return res.status(200).json({
            status: 200,
            success: true,
            message: "Đăng ký thành công"
        }); 
    } catch (error) {
        return res.status(500).json({
            status: 500,
            success: false,
            message: "Lỗi server.",
            error: error.message
        });
    }
}

export async function getInfor(req, res) {
    const id = req.session.accountId;
    try {
        if (!id) {
            return res.status(200).json({
                status: 200,
                success: false,
                message: "Vui lòng đăng nhập"
            });
        }
        const user = await Account.findByPk(id);
        if (!user){
            return res.status(200).json({
                status: 200,
                success: false,
                message: "Không tìm thấy hoặc đã bị xóa"
            });
        }
        return res.status(200).json({
            status: 200,
            success: true,
            data : {
                name: user.name
            }
        });
    } catch (error) {
        return res.status(500).json({
            status: 500,
            success: false,
            message: "Lỗi server.",
            error: error.message
        });
    }
}