module.exports = (sequelize, DataTypes) => {
    const OTP = sequelize.define(
        "otp",
        {
            phone: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            otp: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            address: {
                type: DataTypes.STRING,
                allowNull: false,
            },
        },
        {
            timestamps: false,
        }
    )
    return OTP
}
